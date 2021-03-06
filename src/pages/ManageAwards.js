import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {connect} from 'react-redux';
import {compose} from 'redux';
import {firebaseConnect, isLoaded, pathToJS} from 'react-redux-firebase';
import Select from 'react-select';

import {mapObject, orderedPopulatedDataToJS} from '../helpers';

class AwardRow extends Component {
  static propTypes = {
    award: PropTypes.object,
    onDelete: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    projectList: PropTypes.object.isRequired,
    year: PropTypes.string.isRequired,
  };

  static contextTypes = {
    router: PropTypes.object.isRequired,
  };

  constructor(props, ...args) {
    super(props, ...args);
    this.state = {
      name: '',
      project: null,
      ...(props.award || {}),
    };
  }

  onChangeField = e => {
    this.setState({
      [e.target.name]: e.target.value,
    });
  };

  onChangeProject = choice => {
    this.setState({project: choice.value});
  };

  hasChanges() {
    let {award} = this.props;
    let state = this.state;
    if (!award) return state.name || state.project;
    return award.name !== state.name || award.project !== state.project;
  }

  onSuccess = () => {
    if (!this.props.award) {
      this.setState({name: '', project: null});
    }
  };

  render() {
    let {award, projectList} = this.props;
    let projectOptions = mapObject(projectList)
      .sort((a, b) => ('' + a.name).localeCompare(b.name))
      .map(project => ({
        value: project.key,
        label: project.name,
      }));

    return (
      <form
        onSubmit={e =>
          e.preventDefault() && this.props.onSave(this.state, this.onSuccess)
        }
        className="form Award-Form"
      >
        <div className="row">
          <div className="col-sm-5">
            <input
              className="form-control"
              type="text"
              name="name"
              value={this.state.name}
              onChange={this.onChangeField}
              required
            />
          </div>
          <div className="col-sm-5">
            <Select
              name="project"
              value={this.state.project}
              multi={false}
              options={projectOptions}
              onChange={this.onChangeProject}
            />
          </div>
          <div className="col-sm-2">
            <button
              className="btn btn-primary"
              disabled={!this.hasChanges()}
              onClick={() => this.props.onSave(this.state, this.onSuccess)}
            >
              <span className="glyphicon glyphicon-ok" />
            </button>
            {!!award && (
              <button
                className="btn btn-danger"
                style={{marginLeft: 5}}
                onClick={() => this.props.onDelete(this.state)}
              >
                <span className="glyphicon glyphicon-remove" />
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }
}

class ManageAwards extends Component {
  static propTypes = {
    auth: PropTypes.object,
    awardList: PropTypes.object,
    firebase: PropTypes.object,
    projectList: PropTypes.object,
  };

  static contextTypes = {
    router: PropTypes.object.isRequired,
  };

  constructor(...args) {
    super(...args);
    this.state = {};
  }

  onDelete = award => {
    let {firebase, params} = this.props;
    firebase.remove(`/years/${params.year}/awards/${award.key}`);
  };

  onSave = (award, onSuccess) => {
    let {auth, firebase, params} = this.props;
    let {year} = params;
    if (award.key) {
      firebase
        .update(`/years/${year}/awards/${award.key}`, {
          name: award.name,
          project: award.project || null,
        })
        .then(onSuccess);
    } else {
      firebase
        .push(`/years/${year}/awards`, {
          name: award.name,
          project: award.project || null,
          ts: Date.now(),
          creator: auth.uid,
        })
        .then(onSuccess);
    }
  };

  render() {
    let {awardList, auth, projectList} = this.props;
    if (!isLoaded(auth) || !isLoaded(awardList) || !isLoaded(projectList))
      return <div className="loading-indocator">Loading...</div>;

    let {year} = this.props.params;

    return (
      <div>
        {mapObject(awardList)
          .sort((a, b) => ('' + a.name).localeCompare(b.name))
          .map(award => (
            <AwardRow
              key={award.key}
              award={award}
              onSave={this.onSave}
              onDelete={this.onDelete}
              projectList={projectList}
              year={year}
            />
          ))}
        <AwardRow
          onSave={this.onSave}
          onDelete={this.onDelete}
          projectList={projectList}
          year={year}
        />
      </div>
    );
  }
}

const keyPopulates = [{keyProp: 'key'}];

export default compose(
  firebaseConnect(({params}) => [
    {
      path: `/years/${params.year}/projects`,
      queryParams: ['orderByChild=name'],
      populates: keyPopulates,
      storeAs: 'projectList',
    },
    {
      path: `/years/${params.year}/awards`,
      queryParams: ['orderByChild=name'],
      populates: keyPopulates,
      storeAs: 'awardList',
    },
  ]),
  connect(({firebase}) => ({
    auth: pathToJS(firebase, 'auth'),
    awardList: orderedPopulatedDataToJS(firebase, 'awardList', keyPopulates),
    projectList: orderedPopulatedDataToJS(firebase, 'projectList', keyPopulates),
  }))
)(ManageAwards);

import React from 'react';
import axios from 'axios';
import {translate} from 'react-i18next';

import {Helmet} from 'react-helmet';
import {Snackbar, Typography} from 'material-ui';
import {red} from 'material-ui/colors';

import TimeSync from './TimeSync';

import Auth from './storages/auth';
import Contest from './storages/contest';
import Config from './storages/config';
import Language from './storages/language';

import Main from './Main';
import Login from './Login';

import Loading from './components/loading';

import {useDesktopNotification} from './config';

import './App.css';
import 'typeface-roboto';

class App extends React.Component {
  constructor(props) {
    // eslint-disable-next-line no-console
    console.log('%cDOMjudge', 'color: #3f51b5; font-weight: bold; font-size: 60pt;');
    if (useDesktopNotification)
      Notification.requestPermission();
    super(props);
    this.state = {
      error: false,
      loading: true,
      user: null,
      contest: null,

      snackbar_open: false,
      snackbar_message: ''
    };
  }

  componentDidMount() {
    // Loading logic
    const {i18n} = this.props;
    const lng = Language.getLanguage(); Language.setLanguage(lng);
    i18n.changeLanguage(lng);
    let user, contest;
    const validate_token = (async function(){
      if (!Auth.getUser())
        return;
      let res = await Auth.validateUser();
      this.setState({user: res});
      user = res;
    }).bind(this);
    const check_api = async function(){
      let bef = Date.now();
      let res = (await axios.get('./api/status'));
      let aft = Date.now();
      if (res.status !== 200 || !res.data.pong || !res.data.db_conn) throw new Error();
      TimeSync.setTimediff(res.data.now - (bef+aft)/2);
    };
    const get_contest = (async function(){
      // TODO: Contest.updateInfo에서 Auth.getHeader를 쓰는데 비동기로 풀어나가도 괜찮은지?
      await Contest.updateInfo();
      contest = Contest.getContest();
      this.setState({contest});
    }).bind(this);
    const get_config = Config.updateInfo;
    Promise.all([validate_token(), check_api(), get_contest(), get_config()])
      .then(() => {
        if (user && !contest){
          Auth.doLogout();
          this.setState({user: null});
        }
        this.setState({loading: false});
      })
      .catch(() => this.setState({error: true}));
  }

  toast(message) {
    this.setState({snackbar_open: true, snackbar_message: message});
  }

  render() {
    const {t} = this.props;
    let content, title = 'DOMjudge - React';
    if (this.state.error)
      content = (
        <Typography type="display2" style={{textAlign: 'center', paddingTop: 100, color: red['A400']}}>
          Cannot connect to API server.<br />Please contact administrator.
        </Typography>
      );
    else if (this.state.loading || t('locale') === 'locale')
      content = (
        <Typography type="display2" style={{textAlign: 'center', paddingTop: 100}}>
          Application is loading, please wait...
          <Loading />
        </Typography>
      );
    else if (this.state.user){
      content = (<Main toast={this.toast.bind(this)}
        onLogout={() => this.setState({user: Auth.getUser()})}
        onContestChange={contest => this.setState({contest})}
        user={this.state.user} contest={this.state.contest} />);
      title = this.state.contest.name;
    }
    else
      content = (<Login toast={this.toast.bind(this)} onLogin={() => this.setState({user: Auth.getUser(), contest: Contest.getContest()})} />);

    return (
      <div>
        <Helmet>
          <title>{title}</title>
        </Helmet>
        {content}
        <Snackbar
          anchorOrigin={{vertical: 'top', horizontal: 'right'}}
          open={this.state.snackbar_open}
          onRequestClose={() => this.setState({snackbar_open: false})}
          SnackbarContentProps={{
            'aria-describedby': 'message-id',
          }}
          message={<span id="message-id">{this.state.snackbar_message}</span>}
        />
      </div>
    );
  }
}

export default translate('translations')(App);

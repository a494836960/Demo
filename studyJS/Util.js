import config, {env} from './config.js'
import moment from 'moment';

const TOKEN_EXPIRED_DATE = 2 * 60 * 1000;
let pageObj = null;

function setPage(obj) {
    pageObj = obj;
}

function getPageObj() {
    return pageObj;
}

let Reg = {
    number: /^\d+$/,
    nonNum: /^\D+$/g,
    email: /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/,
    bankFormat: /(\w{4})(?=.)/g,
    mobile: /^[1-9]\d{10}$/,
    money: /^\d+(\.\d+)?$/,
    webSite: /^(http|https):\/\//,
    ali: /(^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$)|(^[a-z0-9_\u4e00-\u9fa5]+$)|(^[1-9]\d{10}$)/,
    china: /[\u4e00-\u9fa5]/g,
    nonChina: /[^\u4e00-\u9fa5]/g,
    taobao: /^[a-z0-9_\u4e00-\u9fa5]+$/,
}

let Util = {
      //格式化时间, 返回的值最大为 N天N小时N分支
    formatDay:function(sec) {
        let days = Math.floor(sec / 60 / 60 / 24);
        let hours = Math.floor((sec - (days * 60 * 60 * 24)) / 60 / 60);
        let minutes = Math.floor((sec - (days * 60 * 60 * 24) - (hours * 60 * 60)) / 60);
        let seconds = Math.floor((sec - (days * 60 * 60 * 24) - (hours * 60 * 60) - (minutes * 60)));

        switch (true) {
          case sec < 60:
            return seconds + '秒'
          case sec <= 60 * 60:
            return `${minutes}:${seconds}`;
          case sec < 60 * 60 * 24:
            return `${hours}:${minutes}:${seconds}`;
          default:
            return `${days}天${hours}:${minutes}:${seconds}`;
        }
      },
    
    /**
     * input onChange 修改值必须和name 相同
     *  example: onChange={Util.standardInputChange.bind(this}
     * @param e
     */
    standardInputChange: function (e, r) {
        let name = '', el;
        if (typeof e == 'string') {
            name = e;
            el = r.target;
        } else {
            el = e.target;
            name = el.getAttribute('name');
        }

        let value = el.value;
        if (el.tagName !== 'TEXTAREA') {
            value = value.trim();
        }
        this.setState({
            [name]: value
        });
    },

    /**
     * number 输入框 change
     */
    numberInputChange(e, r) {
        let name = '', el;
        if (typeof e == 'string') {
            name = e;
            el = r.target;
        } else {
            el = e.target;
            name = el.getAttribute('name');
        }

        let value = el.value;
        if (!(/^\d*(\.?(\d{0,2})?)?$/.test(value))) {
            return;
        }

        this.setState({
            [name]: value.trim()
        });
    },

    /**
     * Checkbox onChange 修改值必须和name 相同
     *  example: onChange={Util.standardInputChange.bind(this}
     * @param e
     */
    standardCheckedChange(e) {
        let el = e.currentTarget || e.target;
        let name = el.getAttribute != 'function' ? el.name : el.getAttribute('name');
        this.setState({
            [name]: !this.state[name]
        })
    },
    /*
    * 更新状态state里的值
    * */
    updateState(key, value) {
        this.setState({
            [key]: value
        })
    },

    //刷新token
    refreshToken() {
        let refreshToken = LS.getItem(LS.constant.REFRESH_TOKEN);
    },

    loadingCount: 0, //用来计数 loading

    /*
    *  刷新token处理
    *   1.如果没有登录时间就不检查，
    *   2.当前时间小于 登录时间 + 过期时间 保存当前请求，然后去更新token
    * */
    fetch({data, method = "POST", url, urlType = '', contentType = '', tokenType, isLoading = true}) {
        /*let tokenDate = LS.getItem(LS.constant.LOGIN_DATE);
        if (!Util.isEmpty(tokenDate)) {
            let curDate = +new Date();
            if (curDate < tokenDate + TOKEN_EXPIRED_DATE) {
                return refreshToken().then(res=>{
                    return Util.ajax(arguments[0]);
                })
            }
        } else {*/
        return Util.ajax(arguments[0]);
        /* }*/

    },

    ajax({data, method = "POST", url, urlType = '', contentType = '', tokenType, isLoading = true}) {
        let path = config.baseUrl + url;
        let params = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            }
        };

        for (let key in data) {
            if (!Util.isEmpty(data[key])) {
                data[key] = Util.replaceEmoji(data[key]);
                data[key] = Util.html_encode(data[key]);
            } else {
                delete data[key];
            }
        }

        if (params.method == 'POST') {
            params.body = JSON.stringify(data);
        } else if (params.method == "GET") {
            let para = Util.json2Params(data);
            path += para;
        }

        if (contentType == 'form') {
            let formData = new FormData();
            for (let key in data) {
                formData.append(key, Util.html_encode(data[key]));
            }
            params.body = formData;
            delete params.headers['Content-Type'];
            params.model = 'no-cors';
        }
        if (tokenType === 'Login') {
            let token = LS.getItem(LS.constant.CAPTCHA_TOKEN);
            params.headers['Captcha-token'] = token;
        } else {
            let token = LS.getItem(LS.constant.TOKEN);
            params.headers['A-Authorization'] = 'Bearer ' + token;
        }

        if (isLoading) {
            if (!pageObj) {
                Util.loadingCount = 1;
            } else {
                Util.loadingCount += 1;
            }
            pageObj.loading(true);
        }

        return fetch(path, params).then((response) => {
            if (isLoading) {
                Util.loadingCount -= 1;
            }
            if (Util.loadingCount === 0) {
                pageObj.loading(false);
            }

            let res = response.json();
            let date = response.headers.get('date');

            return res.then(res => {
                if (!(res instanceof Array)) {
                    res.date = new Date(date);
                }
                return res;
            });
        }).then(res => {
            if (res.status == STATUS_CODE.EXPIRED || res.status == STATUS_CODE.INVALID) {
                pageObj.tips.visible({
                    content: "请重新登录",
                    type: "error",
                    duration: '2000'
                });
                pageObj.props.router.push('/login');
            } else if (res.status !== 200 && config.env.isPC) { //统一的错误管理

                pageObj.tips.visible({
                    content: res.message,
                    type: "error",
                    duration: '2000'
                });
            }
            return res;
        });
    },

    //下载文件
    loadFile({data, method = "POST", url, urlType = '', contentType = '', fileType = '.xlsx', file}) {
        let baseUrl = config.baseUrl;
        let para = Util.json2Params(data);
        url += para;
        let token = LS.getItem(LS.constant.TOKEN);

        let params = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        }
        params.headers['A-Authorization'] = 'Bearer ' + token;
        pageObj.loading(true);
        fetch(baseUrl + url, params).then(res => {
            pageObj.loading(false);
            if (res.status === 200) {
                return res.blob().then(blob => {
                    var a = document.createElement('a');
                    var url = window.URL.createObjectURL(blob);
                    let fileName = '';//res.headers.get('Content-Disposition');
                    fileName = Util.isEmpty(fileName) && !Util.isEmpty(file) ? file + fileType : fileName;
                    fileName = Util.isEmpty(fileName) ? `${Math.floor(Math.random() * 100)}${fileType}` : fileName;
                    a.href = url;
                    a.download = fileName;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                })
            } else {
                return res.json().then(res => {
                    pageObj.tips.visible({
                        content: res.message,
                        type: 'error',
                    });
                });
            }
        })
    },

    //json 格式转 url params结构
    json2Params(json) {
        if (typeof json !== 'object') {
            return "";
        }
        let params = "?";
        for (let key in json) {
            if (!Util.isEmpty(json[key])) { //如果是空的不加入params
                params += `${key}=${json[key]}&`
            }
        }
        params = params.substr(0, params.length - 1);
        return params;
    },

    searchBox(params, cb) {
        this.setState({
            curPage: 1,
        }, () => {
            cb && cb(params);
        })
    },

    moneyFormat(str = "", unit) {
        if (unit === 'f') {
            str = Util.accDiv(Number(str), 100);
        }
        str += '';
        str = str.replace(/[^-+\d\.]/g, '');
        str = Number(str).toFixed(2);
        return str ? str.toString().replace(/(\d)(?=(\d{3})+\.)/g, '$1,') : '';
    },
    numberFormat(str) {
        str = str.toString();
        return str ? str.replace(/(\d)(?=(?:\d{3})+$)/g, '$1,') : '';
    },
    dateFormat(time) {
        return moment(time, config.dateFormat).format(config.dateFormat);
    }, html_encode: (str) => {
        var s = "";
        if (typeof str != 'string' || str.length == 0) return str;
        s = str.replace(/&/g, "&gt;");
        s = s.replace(/</g, "&lt;");
        s = s.replace(/>/g, "&gt;");
        s = s.replace(/\'/g, "&#39;");
        s = s.replace(/\"/g, "&quot;");
        s = s.replace(/\n/g, " ");
        return s;
    },
    checkAuth(auth) { //权限检查
        let codes = LS.getItem(LS.constant.AUTH_CODE) ? LS.getItem(LS.constant.AUTH_CODE).code : [];
        if (codes.indexOf(auth) > -1) {
            return true
        } else {
            return false;
        }
    },
    getREM() {
        return parseFloat(document.documentElement.style.fontSize.replace(/px/));
    },

    parseMenu(menuList) {
        //先要找到根节点的ID
        let parentId = 0;
        menuList.map((item, index) => {
            if (Util.isEmpty(item.parentId)) {
                parentId = item.id;
            }
        });
        let menuListHtml = {}, listHtml = [];
        menuList.map((item, index) => {
            if (item.parentId == parentId) { // 使用ordinal 来补齐
                menuListHtml[item.id] = {
                    key: item.id,
                    id: item.id.toString(),
                    name: item.name,
                    icon: item.icon || '',
                    ordinal: item.ordinal,
                    children: [],
                }
            }
        });

        menuList.map((item, index) => {
            if (item.parentId != parentId && menuListHtml[item.parentId]) {
                menuListHtml[item.parentId].children.push({
                    key: item.id,
                    id: item.id.toString(),
                    name: item.name,
                    icon: item.icon || '',
                    link: item.href || '',
                    ordinal: item.ordinal
                })

                menuListHtml[item.parentId].children.sort((a, b) => {
                    return a.ordinal - b.ordinal;
                });
            }
        });

        for (let key in menuListHtml) {
            if (menuListHtml[key].children.length != 0) {
                listHtml[key] = menuListHtml[key]
            }
        }
        return listHtml;
    },
    /**
     * 下拉列表公共处理方法
     * @param name
     * @param e
     */
    handleDropdownClick(name, e) {
        this.setState({
            [name]: e
        })
    },
    /**
     * 自定义modal show/hide 方式
     * @param name str: modal isShow name
     * @param visible bol:  是否展示
     * @param title str: '' modal 标题
     */
    toggleMyModal(name, visible, title = '') {
        title = typeof title == 'object' ? '' : title;
        this.setState({
            [name]: visible,
            modalTitle: title
        });
    },
    /**
     * search box date change
     * @param key 查询时间 state 对应的 name
     * @param value date value
     */
    dateChange(key, value) {
        this.setState({
            [key]: value
        })
    },
    /**
     * 通用后台返回结果处理
     * @param params  {showTips , res , successCB, failCB, successMsg , errorMsg}
     */
    handleResponseResult(params) {
        let {res, successCB, failCB, showTips, successMsg, errorMsg} = params;
        let msg = '', type = '';
        if (res.status === 200) {
            msg = res.message || successMsg;
            type = 'success';
            successCB && successCB();
        } else {
            msg = res.message || errorMsg || '操作失败';
            type = 'error';
            failCB && failCB()
        }
        showTips({text: msg, type});
    },
    bankCardFormat(str) {
        return str.replace(Reg.bankFormat, "$1 ");
    },
    //文件上传
    fileUploadChange(name, cb, info) {
        let file = info.file;
        if (file.status == 'done') {
            if (file.response.success) {
                cb && cb(file.response.result);
            } else {
                this.context.showTips({text: file.response.message, type: 'error'});
            }

            this.setState({
                [name]: false
            });
        } else if (file.status == 'uploading') {
            this.setState({
                [name]: true
            });
        } else if (info.file.status === 'error') {
            this.context.showTips({text: file.response.message, type: 'error'});
            this.setState({
                [name]: false
            })
        }
    },
    /**
     * 进入权限列表的第一条数据页面
     */
    goIndex() {
        let menu = LS.getItem(LS.constant.AUTH_MENU).auth;
        let url = '';
        for (let i = 0, len = menu.length; i < len; i++) {
            if (!Util.isEmpty(menu[i].href) && !Util.isEmpty(menu[i].href.trim()) && menu[i].href != "0") {
                url = menu[i].href;
                break;
            }
        }

        if (pageObj && url) {
            pageObj.props.router.push(url);
        } else {
            pageObj.tips.visible({
                content: '您当前没有权限进入，请联系管理员',
                type: 'error',
            });
        }
    },
    goLink(url, state) {
        if (state) {
            this.props.router.push(url);
        } else {
            this.props.router.push({pathname: url, state});
        }

    },
    //go 404
    go404() {
        if (pageObj) {
            pageObj.props.router.push('/404');
        }
    },
    /**
     * 判断是否空
     */
    isEmpty(str) {
        let type = typeof str;
        switch (type) {
            case 'object': //如果是对象用stringify转成str 排除 {} 和 null
                if (str instanceof Array) {
                    return str.length > 0 ? false : true;
                } else {
                    let template = JSON.stringify(str);
                    return template === 'null' || template === '{}' ? true : false;
                }
            default: //其他
                str = str + '';
                if (str.length === 0 || str == 'undefined' || str == 'null') {
                    return true;
                }
        }
        return false;
    },
    /**
     * 判断是空对象
     */
    isNull(obj) {
        if (obj instanceof Object) {
            for (let k in obj) {
                return false
            }
            return true;
        } else {
            throw new Error('不是对象');
        }
    },
    /**
     * @param time 秒，
     */
    timerRun(intDiff) {
        var day = 0,
            hour = 0,
            minute = 0,
            second = 0;//时间默认值
        if (intDiff > 0) {
            day = Math.floor(intDiff / (60 * 60 * 24));
            hour = Math.floor(intDiff / (60 * 60)) - (day * 24);
            minute = Math.floor(intDiff / 60) - (day * 24 * 60) - (hour * 60);
            second = Math.floor(intDiff) - (day * 24 * 60 * 60) - (hour * 60 * 60) - (minute * 60);
        }
        if (minute <= 9) minute = '0' + minute;
        if (second <= 9) second = '0' + second;

        if (day == 0 && hour == 0 && minute == 0) {
            return `00:${second}`;
        }

        if (day == 0 && hour == 0) {
            return `${minute}:${second}`;
        }

        if (day == 0) {
            return `${hour}:${minute}:${second}`;
        }

        return `${day}天${hour}:${minute}：${second}`;
    },
    fixedNumber(str) {
        str = str.toString();
        if (str.length == 1) {
            str = '0' + str;
        }
        return str;
    },
    onlyNumber(str) {
        str = str.toString();
        return str.replace(/[^\d\.]/g, '');
    },
    //后台费率转换成前台展示的值 多位小数 * 100 不精确。 需要 10000 勿改
    rateFormat(rate) {
        return Util.formatFloat((rate * 10000 / 100), 4) + '%';
    },
    fen2yuan(fen) { //分转换成元保留2位小数
        return (parseFloat(fen) / 100)
    },

    formatFloat(f, digit) {
        var m = Math.pow(10, digit);
        return parseInt(f * m, 10) / m;
    },

    getTimeDistance(type) {
        const now = new Date();
        const oneDay = 1000 * 60 * 60 * 24;

        if (type === 'today') {
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);
            return [moment(now), moment(now.getTime() + (oneDay - 1000))];
        }

        if (type === 'week') {
            let day = now.getDay();
            now.setHours(0);
            now.setMinutes(0);
            now.setSeconds(0);

            if (day === 0) {
                day = 6;
            } else {
                day -= 1;
            }

            const beginTime = now.getTime() - (day * oneDay);

            return [moment(beginTime), moment(beginTime + ((7 * oneDay) - 1000))];
        }

        if (type === 'month') {
            const year = now.getFullYear();
            const month = now.getMonth();
            const nextDate = moment(now).add(1, 'months');
            const nextYear = nextDate.year();
            const nextMonth = nextDate.month();

            return [moment(`${year}-${fixedZero(month + 1)}-01 00:00:00`), moment(moment(`${nextYear}-${fixedZero(nextMonth + 1)}-01 00:00:00`).valueOf() - 1000)];
        }

        if (type === 'year') {
            const year = now.getFullYear();
            return [moment(`${year}-01-01 00:00:00`), moment(`${year}-12-31 23:59:59`)];
        }
    },
    //导出日期处理
    exportParseDate(start, end) {
        if (Util.isEmpty(start) && Util.isEmpty(end)) {
            return '全时段'
        } else if (Util.isEmpty(start) && !Util.isEmpty(end)) {
            return `截止${end}`
        } else if (!Util.isEmpty(start) && Util.isEmpty(end)) {
            return `${start}后`
        } else {
            return `${start}-${end}`
        }
    },
    selectFilterOption(value, option) {
        if (option.props && (value === option.key + "" || option.props.value.indexOf(value) > -1 || option.props.children.indexOf(value) > -1)) {
            return true;
        }
    },
    /*
     * 提现手续费计算方式 @params withdrawLimit 单笔最高限额
     */
    getWithdrawAmount(dataSource, withdrawLimit, feeRate) {
        withdrawLimit = withdrawLimit + "";
        let limit = parseFloat(withdrawLimit.replace(/,/g, ''));
        let amount = 0;
        //手续费
        let fee = 0;
        dataSource.map(item => {
            let count = 0;
            let money = parseFloat(item.moneyYuan || 0);
            amount += money;
            let lastMoney = 0;
            let newMoney = 0;
            let flag = true;
            do {
                if ((money - newMoney) >= (limit - count)) { //提现金额小于限额
                    lastMoney = limit - count; //当前要用来计算金额的钱
                    newMoney += lastMoney; //剩余金额
                    count = count >= limit ? (limit - 1) : count + 1;
                } else {
                    lastMoney = money - newMoney;
                    flag = false
                }
                let lastFee = (feeRate / 100) * lastMoney;
                fee += lastFee != 0 ? (lastFee > 2 ? lastFee : 2) : 0;
            } while (flag);
        });

        return {
            amount: amount,
            amountFee: fee
        }
    },
    /*
    * Select 过滤筛选
    * */
    filterOption(value, option) {
        if (option.props && (value === option.key + "" || (option.props.children && option.props.children.indexOf(value) > -1))) {
            return true;
        }
    },
    //修改分页
    changePageSize(name, e, cb) {
        this.setState({
            [name]: e
        }, () => {
            cb && cb(this.state.repeat);
        })
    },
    getRealPath() {
        let path = '';
        this.props && this.props.routes && this.props.routes.map(item => {
            path += item.path;
        });
        return path;
    },
    replaceEmoji(key) {
        if (typeof key == 'string') {
            return key.replace(/\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]/g, "");
        }

        return key;
    },
    resetRem() { //重置rem
        var docEl = document.documentElement;
        var clientWidth = docEl.clientWidth;
        if (!clientWidth) return;
        if (clientWidth >= 750) {
            docEl.style.fontSize = '100px'; //1rem  = 100px
        } else {
            docEl.style.fontSize = 100 * (clientWidth / 750) + 'px';
        }
    },

    accMul: function (arg1, arg2) {
        var m = 0, s1 = arg1.toString(), s2 = arg2.toString();
        try {
            m += s1.split(".")[1].length
        } catch (e) {
        }
        try {
            m += s2.split(".")[1].length
        } catch (e) {
        }
        return Number(s1.replace(".", "")) * Number(s2.replace(".", "")) / Math.pow(10, m)
    },
    accDiv: function (arg1, arg2) {
        var t1 = 0, t2 = 0, r1, r2;
        try {
            t1 = arg1.toString().split(".")[1].length
        } catch (e) {
        }
        try {
            t2 = arg2.toString().split(".")[1].length
        } catch (e) {
        }
        r1 = Number(arg1.toString().replace(".", ""))
        r2 = Number(arg2.toString().replace(".", ""))
        return (r1 / r2) * Math.pow(10, t2 - t1);
    },


}

let SS = {
    constant: {
        CHANNEL_T1_SETTLE: 'CHANNEL_T1_SETTLE',
        AUTH_LIST: "AUTH_LIST",
        WALLET_TABS: 'WALLET_TABS', //缓存钱包 WALLET_TABS
        PAYMENT_TABS: 'PAYMENT_TABS', //缓存代付审核 PAYMENT_TABS

        MERCHANT_T1_TABS: 'MERCHANT_T1_TABS', //商户T1结算
        WALLET_PLATFORM_PAGE: 'WALLET_PLATFORM_PAGE', //平台提现翻页记录

        PAYMENT_MERCHANT_PAGE: 'PAYMENT_AUDIT_MERCHANT_PAGE', //保存代付商户代付审核翻页记录
        PAYMENT_AGENT_PAGE: 'PAYMENT_AUDIT_AGENT_PAGE', //保存代付代理商代付审核翻页记录
        PAYMENT_PLATFORM_PAGE: 'PAYMENT_PLATFORM_PAGE', //保存代付 平台 代付审核翻页记录

        MERCHANT_LIST_PAGE: 'MERCHANT_LIST_PAGE', //保存商户列表翻页记录
        AG_MERCHANT_LIST_PAGE: 'AG_MERCHANT_LIST_PAGE', //保存商户代理列表翻页记录
        AG_CHANNEL_LIST_PAGE: 'AG_CHANNEL_LIST_PAGE', //保存通道代理列表翻页记录

        WALLET_MERCHANT_PAGE: 'WALLET_MERCHANT_PAGE', //钱包商户列表翻页记录
        WALLET_AGENT_PAGE: 'WALLET_AGENT_PAGE', //钱包代理列表翻页记录
    },
    setItem: function (key, value) {
        value = typeof value == 'string' ? value : JSON.stringify(value);
        sessionStorage.setItem(key, value);
    },
    getItem: function (key) {
        let value = sessionStorage.getItem(key);
        try {
            return JSON.parseJSON(value);
        } catch (e) {
            return value || '';
        }
    },
    removeItem: function (key) {
        sessionStorage.removeItem(key);
    },
    clear: function () {
        sessionStorage.clear();
    }
}

let LS = {
    constant: {
        LOGIN_DATE: 'LOGIN_DATE', //保存用户登录时间
        USER: "USER", //保存的用户名
        REMEMBER_USER: "REMEMBER_USER", //是否记录密码
        TOKEN: "TOKEN", // token
        REFRESH_TOKEN: 'REFRESH_TOKEN', //刷新token
        USER_INFO: "USER_INFO",
        AUTH_MENU: "AUTH_MENU", //权限菜单
        AUTH_CODE: "AUTH_CODE", //权限CODE
        SYSTEM_TYPE: 'SYSTEM_TYPE',
        PAYMENT_LIST: 'PAYMENT_LIST', //批量支付本地缓存
        CAPTCHA_TOKEN: 'CAPTCHA_TOKEN'
    },
    setItem: function (key, value) {
        value = typeof value == 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, value);
    },
    getItem: function (key) {
        let value = localStorage.getItem(key);
        try {
            return JSON.parse(value);
        } catch (e) {
            return value || '';
        }
    },
    removeItem: function (key) {
        localStorage.removeItem(key);
    },
    clear: function () {
        localStorage.clear();
    }
}
//统一字段校验
const fieldsValidate = {
    phone: [{pattern: Reg.mobile, message: '请输入正确的手机号码'}, {max: 11, message: '手机号码最大11位'}],
    email: [{pattern: Reg.email, message: '请输入正确的邮箱'}, {max: 40, message: '邮箱不能大于40位'}],
    webSite: [{pattern: Reg.webSite, message: '地址需要以 http:// 或 https:// 开头'}, {max: 120, message: '访问地址不能大于120位'}],
    platformName: [{max: 30, message: '平台名称不能大于30位'}],
    loginPassword: [{pattern: /^\S*$/g, message: '登录密码不能带有空格'}, {
        pattern: /(^[^.]{0}|\w{6,20})$/g,
        message: '登录密码限制 6-20位'
    }],
    loginName: [{pattern: /^\S*$/g, message: '登录帐号不能带有空格'}, {min: 4, message: '登录帐号4-20位'}, {
        max: 20,
        message: '登录帐号4-20位'
    }],
    withdrawPassword: [{
        min: 6, message: '提现密码限定6~20个字符'
    }, {max: 20, message: '提现密码限定6~20个字符'}, {pattern: /[^\s]/g, message: '提现密码不能带有空格'}],
    businessLicenseNo: [{
        pattern: /^[a-zA-Z\d]*$/,
        message: '请输入正确的营业执照'
    }],
    legalPeopleCard: [{
        validator: (rule, value, callback) => {
            if (value && value.length != 18) {
                callback('请输入正确的身份证号码');
            }
            callback();
        }
    }],
    name: [{
        validator: (rule, value, callback) => {
            if (Util.isEmpty(value)) {
                callback();
                return;
            }

            let cn = value.replace(Reg.nonChina, '');
            let len = cn.length;
            len += value.length;
            if (len < 2 || len > 20) {
                callback('请输入合法的名称');
            } else {
                callback();
            }
        }
    }],
    fnMatchNumber: ({max, min, maxMessage, minMessage}) => {
        return {
            validator: (rule, value, callback) => {
                if (Util.isEmpty(value)) {
                    callback();
                    return;
                }

                if (!Util.isEmpty(max) && parseFloat(value) > max) {
                    callback(maxMessage);
                }

                if (!Util.isEmpty(min) && parseFloat(value) <= min) {
                    callback(minMessage);
                }
                callback();
            }
        }
    }
}

//所有按钮权限代码
let authCode = {};

module.exports = {Util, Reg, LS, setPage, authCode, getPageObj, pageObj, SS, fieldsValidate};

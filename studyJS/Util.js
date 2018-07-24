import moment from 'moment';
import {STATUS_CODE} from 'vendor/statusConstant'
let config = {
dateFormat: 'yyyy-MM-dd HH:mm:ss'
}
const TOKEN_EXPIRE = 10000;
const INVALID_TOKEN = 10001;
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
    webSite: /^(http|https):\/\//
}

let Util = {

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
    loadingCount: 0, //用来计数 loading
    fetch({data, method = "POST", url, urlType = '', contentType = '', tokenType, isLoading = true}) {
        let path = "/" + url;
        let token = LS.getItem(LS.constant.TOKEN);
        let params = {
            method: method.toUpperCase(),
            //credentials: "include",
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            }
        };

        for (let key in data) {
            data[key] = Util.replaceEmoji(data[key]);
        }

        if (params.method == 'POST' || params.method == "POST") {
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
            if (response.status === 401) {
                pageObj.tips.visible({
                    content: "请重新登录",
                    type: "error",
                    duration: '2000'
                });
                pageObj.props.router.push('/login');
            }

            return res.then(res => {
                if (!(res instanceof Array)) {
                    res.date = new Date(date);
                }
                return res;
            });
        }).then(res => {
            if (res.code == STATUS_CODE.EXPIRED || res.code == STATUS_CODE.INVALID) {
                pageObj.tips.visible({
                    content: "请重新登录",
                    type: "error",
                    duration: '2000'
                });
                pageObj.props.router.push('/login');
            } else if (!res.success) { //统一的错误管理

                pageObj.tips.visible({
                    content: res.msg,
                    type: "error",
                    duration: '2000'
                });
            }
            return res;
        });
    },

    //下载文件
    loadFile({data, method = "POST", url, urlType = '', contentType = '', fileType = '.xlsx', file}) {
        let baseUrl = "/";
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
                    let fileName = res.headers.get('Content-Disposition');
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
                        content: res.msg,
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

    moneyFormat(str = "") {
        str += '';
        str = str.replace(/[^\d\.]/g, '');
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
        s = s.replace(/\n/g, "<br>");
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
        if (res.success) {
            msg = res.msg || successMsg;
            type = 'success';
            successCB && successCB();
        } else {
            msg = res.msg || errorMsg;
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
                this.context.showTips({text: file.response.msg, type: 'error'});
            }

            this.setState({
                [name]: false
            });
        } else if (file.status == 'uploading') {
            this.setState({
                [name]: true
            });
        } else if (info.file.status === 'error') {
            this.context.showTips({text: file.response.msg, type: 'error'});
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
                let template = JSON.stringify(str);
                return template === 'null' || template === '{}' ? true : false;
            case 'array':
                return str.length > 0 ? false : true;
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
        return Util.formatFloat((rate * 10000 / 100), 2) + '%';
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
        let limit = parseFloat(withdrawLimit.replace(/,/g, ''));
        let amount = 0;
        //手续费
        let rate = feeRate / 100;
        let fee = 0;
        dataSource.map(item => {
            let money = parseFloat(item.moneyYuan || 0);
            amount += money;
            let len = Math.ceil(money / limit);
            if (feeRate / 100 * limit > 2) { //如果手续费最低2元
                fee += feeRate / 100 * limit * (len - 1);
                let lastFee = feeRate / 100 * (money % limit == 0 ? limit : money % limit);
                fee += lastFee > 2 ? lastFee : 2;
            } else {
                fee += 2 * len;
            }
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
        if (option.props && (value === option.key + "" || option.props.children.indexOf(value) > -1 || option.props.children.indexOf(value) > -1)) {
            return true;
        }
    },
    /**
     * 修改pageSize
     */
    changePageSize(e, cb) {
        this.setState({pageSize: e}, () => {
            cb && cb(1);
        });
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
    }
}

let SS = {
    constant: {
        
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
    }, {max: 20, message: '提现密码限定6~20个字符'}, {pattern: /[^\s]/g, message: '提现密码不能带有空格'}]
}

//所有按钮权限代码
let authCode = {};

module.exports = {Util, Reg, LS, setPage, authCode, getPageObj, pageObj, SS, fieldsValidate};

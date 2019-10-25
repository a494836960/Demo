/*
* 可控制column 的table
* */

import React, {Component} from 'react';
import {Table, Select, Icon} from 'antd';
import {LS, Util} from 'vendor/common';
import config from 'vendor/config';
import Card from 'component/card';
import MyPagination from 'component/pagination';
import SetTableColumnsModal from 'component/setTableColumnsModal';
import _ from 'lodash'

const Option = Select.Option;
const MODAL_KEY = 'IS_SHOW_MODAL';

class TableSetting extends Component {

    static defaultProps = {
        pagination: false, //false 使用自己的分页查询， true 使用组件分页
        title: null, //如果空放总条数， 如果有类型订单统计的， 放订单统计
        operationBar: null, // 操作栏如果为空 不显示， 并且 tableSize 放置到title 里面
        lsKey: '', //用来保存列表配置的Key
    }

    constructor(props) {
        super(props);
        this.state = {
            selectColumns: [],
            [MODAL_KEY]: false,
            lsKey: ''
        }
    }

    componentWillReceiveProps(nextProps) {
        this.state.lsKey = this.props.lsKey || nextProps.lsKey;
        this.state.selectColumns = this.parseColumns(nextProps);
    }

    /*!*
    * 1、筛选出已选择的列
    * 2、重置scroll.x
    * 3、第一列fixed left 如果有expandedRowRender 不fixed 最后一列判断是否是“操作”固定
    * */
    parseColumns({columns = [], scroll}) {
        if (Util.isEmpty(columns)) {
            return [];
        }

        let selectColumns = LS.getItem(this.state.lsKey); //当前选择的列
        let newColumns = [],
            newCountWidth = 0,
            countWidth = 0,
            countNullWidth = 0;
        if (Util.isEmpty(selectColumns) || (selectColumns.list && selectColumns.list.length === 0)) {
            let oldWidth = 0;
            columns.map(item => { //重置宽度
                oldWidth += Util.isEmpty(item.width) ? 0 : item.width;
            });
            return this.resetWidth(columns, oldWidth, scroll);
        }

        // 1、筛选已选择列
        columns.map(subItem => {
            countWidth = Util.isEmpty(subItem.width) ? countWidth : countWidth + subItem.width; //统计所有列设置时的with
            selectColumns.list.map(item => {
                if (item.dataIndex + "" === subItem.dataIndex + "" && item.title === subItem.title) { //列名和dataIndex 相同才显示
                    newColumns.push(_.clone(subItem));
                    if (Util.isEmpty(subItem.width)) {
                        countNullWidth++
                    } else {
                        newCountWidth = newCountWidth + subItem.width;
                    }
                }
            })
        });

        return this.resetWidth(newColumns, newCountWidth, scroll);
    }

    resetWidth(newColumns, newCountWidth, scroll) { //重置宽度
        let container = document.getElementsByClassName('container')[0];
        let width = container && container.clientWidth - 60;

        scroll.x = newCountWidth;
        if (newCountWidth > (width || 1000) && newColumns[0] && Util.isEmpty(this.props.expandedRowRender)) {
            newColumns[0].fixed = 'left';
            newColumns[newColumns.length-1].fixed = newColumns[newColumns.length-1].title === '操作' ? 'right' : undefined;
        } else if (newColumns[0]) {
            newColumns[0].fixed = undefined;
        }
        return newColumns;
    }

    renderSelectPageSize() {
        let {pageSize, total, title, operationBar, hideSelectPageSize, dataSource,pagination} = this.props;
        let pageSizeOption = [];
        config.pageSizeSelect.map((item, index) => {
            pageSizeOption.push(<Option value={item.value} key={index}>{item.title}</Option>)
        });

        //title 为空
        return null == title ? <div className="page-size-select" style={{width: '100%', 'textAlign': 'center'}}>
                <span>共{total}条记录</span>
                <div style={{float: 'right'}}>
                    {hideSelectPageSize ? null : <span>当前显示条数：</span>}
                    {pagination || hideSelectPageSize ? null : <div style={{display: 'inline-block', width: '100px'}}>
                        <Select value={pageSize}
                                onChange={this.changePageSize.bind(this)}>{pageSizeOption}</Select>
                    </div>}
                    <span style={{marginLeft: '10px', fontSize: '22px', cursor: "pointer", color: '#333'}} title={'列设置'}
                          onClick={Util.updateState.bind(this, MODAL_KEY, true)}><Icon type="setting"/></span>
                </div>
            </div>
            :
            <div className="page-size-select" style={{float: 'right'}}>
                <span style={{marginRight: '10px'}}>共{total}条记录</span>
                {hideSelectPageSize ? null : <span>当前显示条数：</span>}
                {pagination || hideSelectPageSize ? null : <div style={{display: 'inline-block', width: '100px'}}>
                    <Select value={pageSize}
                            onChange={this.changePageSize.bind(this)}>{pageSizeOption}</Select>
                </div>}
                <span style={{marginLeft: '10px', fontSize: '22px', cursor: "pointer", color: '#333'}} title={'列设置'}
                      onClick={Util.updateState.bind(this, MODAL_KEY, true)}><Icon type="setting"/></span>
            </div>
    }

    changePageSize(e) {
        let {changePageSize, loadData} = this.props;
        changePageSize && changePageSize(e, loadData);
    }

    loadData(e) {
        let {loadData} = this.props;
        loadData && loadData(e);
    }

    //保存列
    saveColumn(params) {
        LS.setItem(this.state.lsKey, {list: params});
        this.state.selectColumns = this.parseColumns(this.props);
        Util.updateState.call(this, MODAL_KEY, false);
    }

    render() {
        let {columns, style, cls, titleCls, titleStyle, title, operationBar, operationBarCls, pagination, operationBarStyle, hideSelectPageSize, total, curPage, pageSize, loadData, ...other} = this.props;
        return (<div>
                <SetTableColumnsModal isShow={this.state[MODAL_KEY]}
                                      columns={this.props.columns}
                                      selectColumns={this.state.selectColumns}
                                      onHide={Util.updateState.bind(this, MODAL_KEY, false)}
                                      onSubmit={this.saveColumn.bind(this)}
                >
                </SetTableColumnsModal>
                <Card cls={cls || ''} style={style}>
                    <div className={`table-header ${titleCls || ''}`} style={titleStyle}>
                        {title}
                        {null === operationBar || title === null ? this.renderSelectPageSize() : null}
                    </div>

                    {null === operationBar ?
                        null
                        : <div className="table-operation-bar-2">
                            {operationBar}
                            {title === null ? null : this.renderSelectPageSize()}
                        </div>}

                    <div className="wrapper-table">
                        <Table {...other} columns={this.state.selectColumns} pagination={pagination}></Table>
                    </div>

                </Card>
                {pagination || hideSelectPageSize ? null :
                    <MyPagination total={total} curPage={curPage} pageSize={pageSize}
                                  onChange={this.loadData.bind(this)}/>}
            </div>
        );
    }
}

export default TableSetting;

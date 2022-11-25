import React, { Component } from 'react';
import { List, Avatar, Button, Checkbox, Spin } from 'antd';
import satellite from "../assets/images/satellite.svg";

class SatelliteList extends Component {

    state = {
        selected: []
    }

    onChange = e => {
        //1. get satInfo and checked status
        //2. add or remove to or from  the selected

        const { dataInfo, checked } = e.target;
        const { selected } = this.state;
        const list = this.addOrRemove(dataInfo, checked, selected);
        this.setState({ selected: list })
    }

    addOrRemove = (item, status, list) => {
        //case 1: check is true
        //      - item not in list -> add it
        //case 2: check if false
        //      - item in the list -> remove it 

        const found = list.some(entry => entry.satid === item.satid);
        if (status && !found) {
            list = [...list, item]
        }

        if (!status && found) {
            list = list.filter(entry => {
                return entry.satid !== item.satid;
            });
        }
        return list;
    }

    onShowSatMap = () => {
        //send the selected array to the Main
        this.props.onShowMap(this.state.selected);
    }



    render() {
        const satList = this.props.satInfo ? this.props.satInfo.above : [];
        const { isLoad } = this.props;
        const { selected } = this.state;

        return (

            <div className="sat-list-box" >
                <Button
                    className="sat-list-btn"
                    type="primary"
                    disabled={selected.length === 0}
                    onClick={this.onShowSatMap}

                >Track on the map</Button>
                <hr />
                {
                    isLoad ?
                        <div className="spin-box" >
                            <Spin tip="Loading..." size="large" />
                        </div>
                        :
                        <List
                            className="sat-list"
                            itemLayout="horizontal"
                            size="small"
                            dataSource={satList}
                            renderItem={item => (
                                <List.Item
                                    actions={[<Checkbox dataInfo={item} onChange={this.onChange} />]}
                                >
                                    <List.Item.Meta
                                        avatar={<Avatar size={50} src={satellite} />}
                                        title={<p>{item.satname}</p>}
                                        description={`Launch Date: ${item.launchDate}`}
                                    />

                                </List.Item>
                            )}
                        />
                }

            </div>
        );
    }
}

export default SatelliteList;

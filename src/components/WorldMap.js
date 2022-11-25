import React, { Component } from "react";
import axios from "axios";
import { Spin } from "antd";
import { feature } from "topojson-client";
import { geoKavrayskiy7 } from "d3-geo-projection";
import { geoGraticule, geoPath } from "d3-geo";
import { select as d3Select } from "d3-selection";
import { schemeCategory10 } from "d3-scale-chromatic";
import * as d3Scale from "d3-scale";
import { timeFormat as d3TimeFormat } from "d3-time-format";


import {
    WORLD_MAP_URL,
    SATELLITE_POSITION_URL,
    SAT_API_KEY,
    BASE_URL
} from "../constants";


const width = 960;
const height = 600;

class WorldMap extends Component {
    constructor() {
        super();
        this.state = {
            isLoading: false,
            isDrawing: false
        };
        this.map = null;
        //给色板，颜色的范围domain + range，接下来只需要传数据范围，就可以拿颜色
        this.color = d3Scale.scaleOrdinal(schemeCategory10);
        this.refMap = React.createRef();
        this.refTrack = React.createRef();
    }


    componentDidMount() {
        //数据获取fetch world map
        axios.get(WORLD_MAP_URL)
            .then(res => {
                const { data } = res;
                const land = feature(data, data.objects.countries).features;
                this.generateMap(land);
            })
            .catch(e => console.log('err in fecthing world map data ', e))
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.satData !== this.props.satData) {
            const {
                latitude,
                longitude,
                elevation,
                altitude,
                duration
            } = this.props.observerData;
            //一个快进
            const endTime = duration * 60;

            this.setState({
                isLoading: true
            });

            const urls = this.props.satData.map(sat => {
                //对于每一个卫星，拿到id
                const { satid } = sat;
                const url = `${BASE_URL}/${SATELLITE_POSITION_URL}/${satid}/${latitude}/${longitude}/${elevation}/${endTime}/&apiKey=${SAT_API_KEY}`;

                return axios.get(url);
            });

            Promise.all(urls)
                .then(res => {
                    const arr = res.map(sat => sat.data);
                    this.setState({
                        isLoading: false,//数据载入结束，进入作图阶段
                        isDrawing: true
                    });

                    //case 1: not draw
                    if (!prevState.isDrawing) {
                        this.track(arr);
                    } else {
                        //case 2: still drawing
                        const oHint = document.getElementsByClassName("hint")[0];
                        oHint.innerHTML =
                            "Please wait for these satellite animation to finish before selection new ones!";
                    }
                })
                .catch(e => {
                    console.log("err in fetch satellite position -> ", e.message);
                });
        }
    }


    render() {
        const { isLoading } = this.state;

        return (
            <div className="map-box">
                {isLoading ? (
                    <div className="spinner">
                        <Spin tip="Loading..." size="large" />
                    </div>
                ) : null}
                <canvas className="map" ref={this.refMap} />
                <canvas className="track" ref={this.refTrack} />
                <div className="hint" />
            </div>
        );
    }

    track = data => {
        //case 1: no data -> inform user an error
        if (!data[0].hasOwnProperty("positions")) {
            throw new Error("no position data");
            return;
        }
        //case 2: with data -> track
        const len = data[0].positions.length;
        const { duration } = this.props.observerData;
        //在track map上作图
        const { context2 } = this.map;

        //起始时间
        let now = new Date();
        let i = 0;

        //在运作的时候，每一秒钟调用一次这个函数
        let timer = setInterval(() => {
            let ct = new Date();

            //是否为第一个定位点； 不是第一个定位点，计算时间流逝了多久
            let timePassed = i === 0 ? 0 : ct - now;
            let time = new Date(now.getTime() + 60 * timePassed);

            //清除此画板的上一个画面（范围）
            context2.clearRect(0, 0, width, height);

            context2.font = "bold 14px sans-serif";
            context2.fillStyle = "#333";
            context2.textAlign = "center";
            context2.fillText(d3TimeFormat(time), width / 2, 10);

            if (i >= len) {
                //结束啦
                clearInterval(timer);
                this.setState({ isDrawing: false });
                const oHint = document.getElementsByClassName("hint")[0];
                oHint.innerHTML = "";
                return;
            }

            data.forEach(sat => {
                const { info, positions } = sat;
                //真正打点
                this.drawSat(info, positions[i]);
            });
            i += 60;
        }, 1000);
    };

    drawSat = (sat, pos) => {
        const { satlongitude, satlatitude } = pos;

        if (!satlongitude || !satlatitude) return;

        const { satname } = sat;
        const nameWithNumber = satname.match(/\d+/g).join("");

        const { projection, context2 } = this.map;
        //找到地球上对应的xy
        const xy = projection([satlongitude, satlatitude]);

        context2.fillStyle = this.color(nameWithNumber);
        context2.beginPath();
        context2.arc(xy[0], xy[1], 4, 0, 2 * Math.PI);
        context2.fill();

        context2.font = "bold 11px sans-serif";
        context2.textAlign = "center";
        context2.fillText(nameWithNumber, xy[0], xy[1] + 14);
    };





    generateMap(land) {
        //generate a projection and define the projection 
        const projection = geoKavrayskiy7()
            .scale(170)
            //中心点x,y点
            .translate([width / 2, height / 2])
            //精准度
            .precision(.1);

        //生成函数进行经纬度打点
        const graticule = geoGraticule();
        //console.log(graticule)

        //canvas map
        const canvas = d3Select(this.refMap.current)
            //define 属性
            .attr("width", width)
            .attr("height", height);

        //canvas track
        const canvas2 = d3Select(this.refTrack.current)
            .attr("width", width)
            .attr("height", height);

        const context = canvas.node().getContext("2d");
        const context2 = canvas2.node().getContext("2d");


        //生成画笔
        let path = geoPath()
            .projection(projection)
            .context(context);

        //开始画图
        land.forEach(ele => {
            context.fillStyle = '#B3DDEF';//作图填充区域的颜色 国家内的颜色
            context.strokeStyle = '#000';//画笔颜色 边界线
            context.globalAlpha = 0.7;//强弱程度

            context.beginPath();
            path(ele);  //画图的第一个点
            context.fill();
            context.stroke();

            context.strokeStyle = 'rgba(220, 220, 220, 0.1)';
            context.beginPath();
            path(graticule());
            context.lineWidth = 0.1;
            context.stroke();

            //经纬度线的outline
            context.beginPath();
            context.lineWidth = 0.5;
            path(graticule.outline());
            context.stroke();
        });
        this.map = {
            projection: projection,
            context: context,
            context2: context2
        };
    };

}


export default WorldMap;

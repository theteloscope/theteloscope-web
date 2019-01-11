
/* D3 CHART */

chartDatetimeFormatter = d3.time.format("%d.%m.%y - %H:%M"); //see https://github.com/mbostock/d3/wiki/Time-Formatting
tableDatetimeFormatter = d3.time.format("%d.%m.%y - %H:%M:%S"); //see https://github.com/mbostock/d3/wiki/Time-Formatting

$(function () {
    $("#refresh_historical_btn")
        .button()
        .click(function (event) {
            refreshChart()
        });
});

function refreshChart() {
    //d3.selectAll("#chart svg").html("");
    //document.getElementById("chart_title").innerHTML="";
    history(document.getElementById("account").value, document.getElementById("sensor_id").value, document.getElementById("samples").value * 20 + 1);
}

function drawChart(chartData) {
    nv.addGraph(function () {
        var chart = nv.models.multiChart()
            .margin({ top: 30, right: 100, bottom: 100, left: 100 })

        chart.xAxis
            .rotateLabels(-45)
            .tickFormat(function (d) {
                return chartDatetimeFormatter(new Date(d))
            });

        chart.yAxis1
            .axisLabel(chartData[0].key)
            .tickFormat(d3.format('.01f'));

        chart.yDomain1([Math.floor(chartData[0].minY * 0.98), Math.ceil(chartData[0].maxY * 1.02)]);
        chart.yDomain2([Math.floor(chartData[1].minY * 0.98), Math.ceil(chartData[1].maxY * 1.02)]);

        chart.yAxis2
            .axisLabel(chartData[1].key)
            .tickFormat(d3.format('.01f'));

        d3.select('#chart svg')
            .datum(chartData)
            .transition()
            .duration(500)
            .call(chart);

        //chart.update();

        nv.utils.windowResize(chart.update);

        return chart;
    });
}


/* TELOS */

function createNet() {
    eos = Eos({
        //httpEndpoint: 'http://127.0.0.1:8888',
        //httpEndpoint: 'https://api-kylin.eosasia.one',
        //httpEndpoint: 'https://junglehistory.cryptolions.io',
        //httpEndpoint: 'http://blockchain.fundacionctic.org:8888',
        //httpEndpoint: 'https://testnet.eos.miami',
        httpEndpoint: 'https://testnetapi.theteloscope.io',
        verbose: false
    })
    return eos
}

function history(account, sensor_id, samples) {
    let net = createNet();
    var series1_data = [];
    var series2_data = []

    var spinner_opts = {
        lines: 10, // The number of lines to draw
        length: 30, // The length of each line
        width: 10, // The line thickness
        radius: 36, // The radius of the inner circle
        scale: 0.95, // Scales overall size of the spinner
        corners: 1, // Corner roundness (0..1)
        color: '#ce7600', // CSS color or array of colors
        fadeColor: 'transparent', // CSS color or array of colors
        speed: 1, // Rounds per second
        rotate: 0, // The rotation offset
        animation: 'spinner-line-fade-default', // The CSS animation name for the lines
        direction: 1, // 1: clockwise, -1: counterclockwise
        zIndex: 2e9, // The z-index (defaults to 2000000000)
        className: 'spinner', // The CSS class to assign to the spinner
        top: '40%', // Top position relative to parent
        left: '50%', // Left position relative to parent
        position: 'absolute' // Element positioning
    };

    var spinner_target = document.getElementById("chart");

    var spinner = new Spinner(spinner_opts).spin(spinner_target);

    net.getTableRows({
        code: 'sensordapper',
        scope: account,
        table: 'sensors',
        table_key: 'id',
        lower_bound: sensor_id,
        upper_bound: sensor_id + 1,
        json: true
    })
        .then(function (response) {
            if (!response.rows.length) {
                spinner.stop();
                document.getElementById("chart_title").innerHTML = "<h2>Unknown Account / Sensor Id<h2>";
                return;
            }

            var time_window = Date.now() - document.getElementById("samples").value * 3600000;
            var sample_window = document.getElementById("sample_window").value;

            net.getActions(account, -1, -sample_window).then(nodehistory => {
                let labels = response.rows[0].labels;
                let min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
                let max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
                for (i = 0; i < nodehistory.actions.length; i++) {
                    switch (nodehistory.actions[i].action_trace.act.name) {
                        case 'multiupload':
                            if (nodehistory.actions[i].action_trace.act.data.id == sensor_id) {
                                if (nodehistory.actions[i].action_trace.act.data.timestamp < time_window)
                                    break;
                                series1_data.push({ x: new Date(parseInt(nodehistory.actions[i].action_trace.act.data.timestamp, 10)), y: nodehistory.actions[i].action_trace.act.data.values[0] });
                                series2_data.push({ x: new Date(parseInt(nodehistory.actions[i].action_trace.act.data.timestamp, 10)), y: nodehistory.actions[i].action_trace.act.data.values[1] });
                                if (parseFloat(nodehistory.actions[i].action_trace.act.data.values[0]) < min[0])
                                    min[0] = parseFloat(nodehistory.actions[i].action_trace.act.data.values[0]);
                                if (parseFloat(nodehistory.actions[i].action_trace.act.data.values[1]) < min[1])
                                    min[1] = parseFloat(nodehistory.actions[i].action_trace.act.data.values[1]);
                                if (parseFloat(nodehistory.actions[i].action_trace.act.data.values[0]) > max[0])
                                    max[0] = parseFloat(nodehistory.actions[i].action_trace.act.data.values[0]);
                                if (parseFloat(nodehistory.actions[i].action_trace.act.data.values[1]) > max[1])
                                    max[1] = parseFloat(nodehistory.actions[i].action_trace.act.data.values[1]);
                            }
                            break;
                    }
                }
                var EOSchartData = [];
                EOSchartData.push({ key: labels[0], strokeWidth: 3.0, color: "#FCDAB0", values: series1_data });
                EOSchartData.push({ key: labels[1], strokeWidth: 3.0, color: "#A4C4E8", values: series2_data });
                EOSchartData[0].type = "line";
                EOSchartData[0].yAxis = 1;
                EOSchartData[0].minY = min[0];
                EOSchartData[0].maxY = max[0];
                EOSchartData[1].type = "line";
                EOSchartData[1].yAxis = 2;
                EOSchartData[1].minY = min[1];
                EOSchartData[1].maxY = max[1];
                //console.log(EOSchartData);
                document.getElementById("chart_title").innerHTML = "<h2>" + response.rows[0].location + "</h2>";
                spinner.stop();
                drawChart(EOSchartData);
            })
        })

};

history(document.getElementById("account").value, document.getElementById("sensor_id").value, document.getElementById("samples").value * 20 + 1);

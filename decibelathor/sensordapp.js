
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

        d3.select('#chart svg')
            .datum(chartData)
            .call(chart);

        //chart.update();

        nv.utils.windowResize(chart.update);
        chart.tooltip.enabled(false);
        return chart;
    });
}


/* TELOS */

function createNet() {
    eos = Eos({
        httpEndpoint: 'https://api.theteloscope.io',
        verbose: false
    })
    return eos
}

function history(account, sensor_id, samples) {
    let net = createNet();
    var series1_data = [];
    var date= new Date()
    date.setSeconds(0);
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
                document.getElementById("chart_title").innerHTML = "<h2>Unknown Account / Sensor Id<h2>";
                return;
            }
            var time_window = (date - document.getElementById("samples").value * 1000);
            // var sample_window = document.getElementById("sample_window").value;
            var sample_window = 700;

            net.getActions(account, -1, -sample_window).then(nodehistory => {
                let labels = response.rows[0].labels;
                let min = [Number.POSITIVE_INFINITY];
                let max = [Number.NEGATIVE_INFINITY];
                nodehistory.actions.sort((a, b) => {
                    //treat as int for correct sorting
                    if (parseInt(a.action_trace.act.data.timestamp) < parseInt(b.action_trace.act.data.timestamp)) return 1;
                    else return -1;
                  });
                for (i = 0; i < nodehistory.actions.length; i++) {
                    switch (nodehistory.actions[i].action_trace.act.name) {
                        case 'multiupload':
                            if (nodehistory.actions[i].action_trace.act.data.id == sensor_id) {
                                if (nodehistory.actions[i].action_trace.act.data.timestamp < time_window)
                                    break;
                                series1_data.push({ x: new Date(parseInt(nodehistory.actions[i].action_trace.act.data.timestamp, 10)), y: nodehistory.actions[i].action_trace.act.data.values[0] });
                                if (parseFloat(nodehistory.actions[i].action_trace.act.data.values[0]) < min[0])
                                    min[0] = parseFloat(nodehistory.actions[i].action_trace.act.data.values[0]);
                                if (parseFloat(nodehistory.actions[i].action_trace.act.data.values[0]) > max[0])
                                    max[0] = parseFloat(nodehistory.actions[i].action_trace.act.data.values[0]);
                            }
                            break;
                    }
                }
                var EOSchartData = [];
                // EOSchartData.push({ key: labels[0], strokeWidth: 6.0, color: "#7060ff", values: series1_data });
                EOSchartData.push({ key: labels[0], strokeWidth: 3.0, color: "#563D7C", values: series1_data });
                EOSchartData[0].type = "line";
                EOSchartData[0].yAxis = 1;
                EOSchartData[0].minY = min[0];
                EOSchartData[0].maxY = max[0];
                //console.log(EOSchartData);
                document.getElementById("chart_title").innerHTML = "<h2>" + response.rows[0].location + "</h2>";
                drawChart(EOSchartData);
                    setTimeout(function(){ realTime(); }, 1500);
            })
        })

};
async function realTime(){
    history(document.getElementById("account").value, document.getElementById("sensor_id").value, document.getElementById("samples").value * 20 + 1);
    //refreshChart();
}

history(document.getElementById("account").value, document.getElementById("sensor_id").value, document.getElementById("samples").value * 20 + 1);

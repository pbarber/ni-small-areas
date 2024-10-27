// TODO: add long term conditions data
// TODO: add extra dataset
// TODO: add dataset selector
// TODO: add choropleth map
// TODO: add hex map
// TODO: add data field categories and searchability
// TODO: add area information modal

// Initialize the echarts instance based on the prepared dom
var myChart = echarts.init(document.getElementById('main'));
var store = null;
var dimensions = null;
var metbrewer = null;
var datasetURL = null;
var datasetTitle = null;
var datasetIndex = null;
var settings = {};
var categories = [];
var isSmallMultiple = false;
var chartAxes = 0;
var chartSeries = 0;
var bottomSheet = document.querySelector('.bottom-sheet');
var bottomSheetInstance = M.Modal.init(bottomSheet);
var infoModalInstance = M.Modal.init(document.getElementById('info-modal'));
const params = new URLSearchParams(location.search);
if (params.get("metadataURL")) {
    settings.metadataURL = params.get("metadataURL");
} else {
    settings.metadataURL = "sa-metadata.json";
}

// Create a promise for loading sa-dimensions.json
var dimensionsPromise = $.get(settings.metadataURL).then(function (data) {
    dimensions = data.dimensions;
    datasetURL = data.dataset;
    datasetTitle = data.title;
    datasetIndex = data.index;
    datasetName = data.name;
    return data;
});

// Create a promise for loading metbrewer.json
var metbrewerPromise = $.get('metbrewer.json').then(function (data) {
    metbrewer = data;
    return data;
});

// Use Promise.all to wait for both promises to resolve
Promise.all([dimensionsPromise, metbrewerPromise]).then(function () {
    if (params.get("chartTitle") == "") {
        settings.chartTitle = "";
    } else {
        if (params.get("chartTitle")) {
            settings.chartTitle = params.get("chartTitle");
        } else {
            settings.chartTitle = "NI " + datasetTitle + " statistics explorer";
        }
    }
    if (metbrewer.hasOwnProperty(params.get("palette"))) {
        settings.palette = params.get("palette");
    } else {
        settings.palette = "Signac";
    }
    // Load sa-stats.json with the dynamically constructed URL
    Papa.parse(datasetURL, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function (results) {
            store = results.data.map(row => {
                // Convert each row to an object
                return Object.fromEntries(
                    Object.entries(row).map(([key, value]) => {
                        // Convert empty strings to null
                        return [key, value === "" ? null : value];
                    })
                );
            }).sort((a, b) => b[datasetIndex] - a[datasetIndex]);
            Object.entries(dimensions).filter(v => v[1].bins).forEach((d, idx) => {
                const binSize = store.length / d[1].bins[0];
                const suffix = (d[1].bins[0] == 10) ? ' decile' : (d[1].bins[0] == 100) ? ' centile' : ' binned';
                // Calculate the binned variables
                store.map((a, idx) => {
                    return ({
                        index: idx,
                        value: a[d[0]]
                    });
                }).sort((a, b) => (a.value - b.value)).map((e, i) => {
                    const value = parseInt(i / binSize) + 1;
                    store[e.index][d[0] + suffix] = value;
                });
                dimensions[d[0] + suffix] = {
                    type: 'Binned'
                };
                if (d[1].hasOwnProperty('description')) {
                    dimensions[d[0] + suffix].description = d[1].description + suffix;
                }
                if (d[1].hasOwnProperty('URL')) {
                    dimensions[d[0] + suffix].URL = d[1].URL;
                }
                if (d[1].hasOwnProperty('date')) {
                    dimensions[d[0] + suffix].date = d[1].date;
                }
                if (d[1].hasOwnProperty('extremes')) {
                    dimensions[d[0] + suffix].extremes = d[1].extremes;
                }
                if (d[1].title) {
                    dimensions[d[0] + suffix].title = d[1].title + suffix;
                }
            });
            if (dimensions.hasOwnProperty(params.get("x"))) {
                settings.x = params.get("x");
            } else {
                settings.x = Object.entries(dimensions).filter(a => a[1].type == 'Metric')[0][0];
            }
            if (dimensions.hasOwnProperty(params.get("y"))) {
                settings.y = params.get("y");
            } else {
                settings.y = Object.entries(dimensions).filter(a => a[1].type == 'Metric')[1][0];
            }
            if (dimensions.hasOwnProperty(params.get("colour"))) {
                settings.colour = params.get("colour");
            } else {
                settings.colour = Object.entries(dimensions).filter(a => a[1].type == 'Category')[0][0];
            }
            if (dimensions.hasOwnProperty(params.get("smallMultiple"))) {
                settings.smallMultiple = params.get("smallMultiple");
            } else {
                settings.smallMultiple = 'None';
            }
            updateChart();
            var elems = document.querySelectorAll('select');
            var instances = M.FormSelect.init(elems);

            // Fill out the options in the selectors based on the dimensions of the dataset
            // Hide x options when selected for y and vice versa
            var ogxm = createOptGroup('Metrics');
            var ogxb = createOptGroup('Binned metrics');
            var ogym = createOptGroup('Metrics');
            var ogmc = createOptGroup('Categories');
            var ogmb = createOptGroup('Binned metrics');
            var ogcc = createOptGroup('Categories');
            var ogcb = createOptGroup('Binned metrics');
            for (const [key, value] of Object.entries(dimensions)) {
                if (value.type == 'Metric') {
                    ogxm.append(createOption(useTitleIfExists(key), key, (key == settings.x), (key == settings.y)));
                    ogym.append(createOption(useTitleIfExists(key), key, (key == settings.y), (key == settings.x)));
                } else if (value.type == 'Category') {
                    ogmc.append(createOption(useTitleIfExists(key), key, false, false));
                    ogcc.append(createOption(useTitleIfExists(key), key, (key == settings.colour), false));
                } else if (value.type == 'Binned') {
                    ogxb.append(createOption(useTitleIfExists(key), key, (key == settings.x), false));
                    ogmb.append(createOption(useTitleIfExists(key), key, false, false));
                    ogcb.append(createOption(useTitleIfExists(key), key, (key == settings.colour), false));
                }
            }
            ogym.append(createOption('Count of ' + datasetTitle + 's', 'Count of ' + datasetTitle + 's', false, true));
            document.getElementById("x-select").append(ogxm, ogxb);
            document.getElementById("y-select").append(ogym);
            ogmc.append(createOption('None', 'None', true, false));
            document.getElementById("multiple-select").append(ogmc, ogmb);
            document.getElementById("colour-select").append(ogcc, ogcb);

            for (const key of Object.keys(metbrewer)) {
                document.getElementById("palette-select").append(createOption(key, key, (key == settings.palette)));
            }
            hideSelected("y-select", settings.x, settings.y, (dimensions[settings.x].type == 'Binned'));
            hideSelected("x-select", (dimensions[settings.x].type == 'Binned') ? settings.y : 'Count of ' + datasetTitle + 's', settings.x);
            $('#x-select').formSelect();
            $('#y-select').formSelect();
            $('#multiple-select').formSelect();
            $('#colour-select').formSelect();
            $('#palette-select').formSelect();
        }
    });
});

function tooltipCallback(args) {
    return (
        ((args.data[3] != 'Count of ' + datasetTitle + 's') ? (args.data[3] + ': ' + args.data[5] + '<br />') : '') +
        (dimensions[settings.x] ? useTitleIfExists(settings.x) : settings.x) + ': ' + args.data[0] + '<br />' +
        ((args.data[3] != 'Count of ' + datasetTitle + 's') ? (useTitleIfExists(settings.y) + ': ') : ('Count of ' + datasetTitle + 's: ')) + args.data[1] + '<br />' +
        args.marker + ' ' + useTitleIfExists(settings.colour) + ': ' + args.data[4]
    );
}

function createOptGroup(label) {
    var g = document.createElement("optgroup");
    g.label = label;
    return (g);
}

function createOption(text, value, selected, disabled) {
    var el = document.createElement("option");
    el.text = text;
    el.value = value;
    el.selected = selected;
    el.disabled = disabled;
    return (el);
}

function hideSelected(selectorId, hide, selected, showCount = false) {
    var select = document.getElementById(selectorId);
    for (var i = 0; i < select.length; i++) {
        if (select[i].value == 'Count of ' + datasetTitle + 's') {
            select[i].disabled = !showCount;
            select[i].selected = showCount;
        } else {
            select[i].disabled = (select[i].value == hide) || (showCount);
            select[i].selected = (select[i].value == selected) && (!showCount);
        }
    }
}

function useTitleIfExists(column) {
    if (dimensions[column].hasOwnProperty('title')) {
        return (dimensions[column].title);
    } else {
        return (column);
    }
}

function labelExtremes(column, idx, maxIdx, value) {
    if ((dimensions[column].type == 'Binned') && (dimensions[column].hasOwnProperty('extremes'))) {
        if (idx == 0) {
            return (value + ' - ' + dimensions[column].extremes[0]);
        } else if (idx == maxIdx) {
            return (value + ' - ' + dimensions[column].extremes[1]);
        }
    }
    return (value);
}

function orderCategories(column) {
    var cats = [...new Set(store.map(a => a[column]))];
    if (dimensions[column].type == 'Binned') {
        cats.sort((a, b) => parseInt(a) - parseInt(b));
    } else if (dimensions[column].hasOwnProperty('order')) {
        cats.sort((a, b) => dimensions[column].order.indexOf(a) - dimensions[column].order.indexOf(b));
    } else {
        cats.sort();
    }
    return (cats);
}

$('.material-select').on('contentChanged', function () {
    $(this).formSelect();
});

function showInfo(item, variable) {
    if (dimensions.hasOwnProperty(variable)) {
        document.getElementById(item + '-info').innerHTML = dimensions[variable].description;
        document.getElementById(item + '-url').innerHTML = '<a href="' + dimensions[variable].URL + '" target="_blank">' + dimensions[variable].date + '</a>';
    } else {
        document.getElementById(item + '-info').innerHTML = variable;
        document.getElementById(item + '-url').innerHTML = '';
    }
}

// Specify the configuration items and data for the chart
myChart.setOption({
    toolbox: {
        feature: {
            saveAsImage: {},
            myTool1: {
                show: params.get("noconfig") ? false : true,
                title: 'Choose variables',
                icon: 'path://M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z',
                onclick: function () {
                    bottomSheetInstance.open();
                }
            },
            myTool2: {
                show: params.get("noconfig") ? false : true,
                icon: 'path://M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z',
                onclick: function () {
                    const url = location.protocol + '//' + location.host + location.pathname + '?' + (new URLSearchParams(settings).toString());
                    navigator.clipboard.writeText(url);
                }
            },
            myTool3: {
                show: true,
                title: 'Show information',
                icon: 'path://M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z',
                onclick: function () {
                    showInfo('x-axis', settings.x);
                    showInfo('y-axis', (dimensions[settings.x].type == 'Binned') ? 'Count of ' + datasetTitle + 's' : settings.y);
                    showInfo('small-multiples', settings.smallMultiple);
                    showInfo('colours', settings.colour);
                    showInfo('colour-scheme', settings.palette);
                    infoModalInstance.open();
                }
            }
        }
    },
    tooltip: { trigger: "item", formatter: tooltipCallback },
});

var scatterModalInstance = M.Modal.init(document.querySelector('#scatter-modal'));

function updateChart() {
    categories = orderCategories(settings.colour);
    isSmallMultiple = (settings.smallMultiple != 'None');
    var series = [];
    var yAxis = [];
    var xAxis = [];
    var grid = [];
    var titles = [];
    const xHasDataMin = dimensions[settings.x] ? (dimensions[settings.x].dataMin ? true : false) : false;
    const yHasDataMin = dimensions[settings.y] ? (dimensions[settings.y].dataMin ? true : false) : false;
    const yBinned = (dimensions[settings.y].type == 'Binned');
    const xBinned = (dimensions[settings.x].type == 'Binned');
    const colourBinned = (dimensions[settings.colour].type == 'Binned');
    const xCategories = xBinned ? [...new Set(store.map(a => a[settings.x]))] : [];
    if (isSmallMultiple) {
        var yCategories = orderCategories(settings.smallMultiple);
        const height = 100 / yCategories.length;
        const pixels = window.innerHeight;
        var multHeight = (pixels * height) / 100;
        if (multHeight < 200) {
            multHeight = 200;
            myChart.resize({ height: ((multHeight + 30) * yCategories.length) + 50 + 'px' });
        } else {
            multHeight = multHeight - (pixels / 15);
            myChart.resize({ height: ((multHeight + 30) * yCategories.length) + 50 + 'px' });
        }
        // Create the data object dependent on whether x is binned or not
        var data = {};
        yCategories.forEach(function (cat, idx) {
            if (dimensions[settings.x].type == 'Binned') {
                const subset = Object.entries(store.filter(d => d[settings.smallMultiple] == cat).reduce(
                    function (acc, item) {
                        acc[item[settings.x]][item[settings.colour]]++;
                        return (acc);
                    },
                    Object.fromEntries([...new Set(store.map(a => a[settings.x]))].sort().map(a => [a, Object.fromEntries(categories.map(d => [d, 0]))])) // This is necessary for ordering of x axis
                )).sort(
                    (a, b) => a[0] - b[0]
                ).map(
                    e => Object.entries(e[1]).map(
                        d => [
                            e[0],
                            d[1],
                            metbrewer[settings.palette].colours[categories.indexOf(colourBinned ? parseInt(d[0]) : d[0])],
                            'Count of ' + datasetTitle + 's',
                            colourBinned ? parseInt(d[0]) : d[0],
                            null
                        ]
                    )
                ).flat(1);
                data[cat] = subset;
            } else {
                data[cat] = store.filter(d => d[settings.smallMultiple] == cat).map(
                    d => [
                        d[settings.x],
                        d[settings.y],
                        metbrewer[settings.palette].colours[categories.indexOf(d[settings.colour])],
                        d[datasetIndex],
                        labelExtremes(settings.colour, categories.indexOf(d[settings.colour]), categories.length - 1, d[settings.colour]),
                        d[datasetName]
                    ]
                );
            }
        });
        // Get the y/x axis min/max after the data calculations
        const yMin = Object.values(data).flat().reduce((a, b) => (yBinned ? ((a < parseInt(b[1])) ? a : parseInt(b[1])) : ((a < b[1]) ? a : b[1])));
        var yMax = Object.values(data).flat().reduce((a, b) => (yBinned ? ((a > parseInt(b[1])) ? a : parseInt(b[1])) : ((a > b[1]) ? a : b[1])));
        const xMin = Object.values(data).flat().reduce((a, b) => (xBinned ? ((a < parseInt(b[0])) ? a : parseInt(b[0])) : ((a < b[0]) ? a : b[0])));
        const xMax = Object.values(data).flat().reduce((a, b) => (xBinned ? ((a > parseInt(b[0])) ? a : parseInt(b[0])) : ((a > b[0]) ? a : b[0])));
        if ((settings.smallMultiple != settings.colour) && (xBinned)) {
            yCategories.forEach(function (cat, idx) {
                xCategories.forEach(function (col, cidx) {
                    const subset = data[cat].filter(a => a[0] == col);
                    const total = subset.reduce((a, b) => a + b[1], 0);
                    yMax = (total > yMax) ? total : yMax;
                });
            });
        }
        // Set up the plots
        yCategories.forEach(function (cat, idx) {
            // Small multiples not based on colour where x is binned
            if ((settings.smallMultiple != settings.colour) && (xBinned)) {
                categories.slice().reverse().forEach(function (col, cidx) {
                    const subset = data[cat].filter(a => a[4] == col);
                    series.push({
                        type: 'bar',
                        name: '',
                        id: (idx * categories.length) + cidx,
                        yAxisIndex: idx,
                        xAxisIndex: idx,
                        coordinateSystem: 'cartesian2d',
                        data: subset,
                        stack: cat,
                        itemStyle: {
                            color: function (data) {
                                return data.value[2];
                            }
                        }
                    });
                });
            } else {
                // Small multiples based on colour  or where x is not binned
                series.push({
                    type: xBinned ? 'bar' : 'scatter',
                    name: ((settings.smallMultiple == settings.colour) ? labelExtremes(settings.smallMultiple, idx, yCategories.length - 1, cat) : ''),
                    id: idx,
                    yAxisIndex: idx,
                    xAxisIndex: idx,
                    coordinateSystem: 'cartesian2d',
                    data: data[cat],
                    stack: xBinned ? cat : null,
                    itemStyle: {
                        color: function (data) {
                            return data.value[2];
                        }
                    }
                });
            }
            yAxis.push({
                id: idx,
                type: 'value',
                name: xBinned ? 'Count of ' + datasetTitle + 's' : useTitleIfExists(settings.y),
                nameLocation: 'middle',
                nameGap: 40,
                gridIndex: idx,
                min: yHasDataMin ? yMin : null,
                max: yMax,
                axisLabel: {
                    show: true,
                    showMinLabel: yHasDataMin ? false : null,
                    showMaxLabel: false
                },
                axisLine: { show: true },
                axisTick: { show: true }
            });
            xAxis.push({
                id: idx,
                type: xBinned ? 'category' : 'value',
                name: (idx == yCategories.length - 1) ? useTitleIfExists(settings.x) : '',
                min: xHasDataMin ? xMin : null,
                max: xBinned ? xMax - 1 : xMax,
                gridIndex: idx,
                axisLabel: {
                    show: (idx == yCategories.length - 1),
                    showMinLabel: xHasDataMin ? false : null,
                    showMaxLabel: xHasDataMin ? false : null,
                    formatter: function (value, idx) {
                        return (labelExtremes(settings.x, idx, xCategories.length - 1, value));
                    }
                },
                axisLine: { show: (idx == yCategories.length - 1) },
                axisTick: { show: (idx == yCategories.length - 1) }
            });
            grid.push({
                id: idx,
                left: '5%',
                right: '21%',
                top: ((multHeight + 30) * idx) + 50,
                height: multHeight,
            });
            titles.push({
                textAlign: 'right',
                text: labelExtremes(settings.smallMultiple, idx, yCategories.length - 1, cat),
                left: '78%',
                top: ((multHeight + 30) * idx) + 30,
                textStyle: {
                    fontSize: 14,
                    fontWeight: 'normal'
                }
            });
        });
        if (settings.smallMultiple != settings.colour) {
            categories.forEach(function (cat, idx) {
                series.push(
                    {
                        type: 'scatter',
                        name: labelExtremes(settings.colour, idx, categories.length - 1, cat),
                        id: series.length,
                        data: null,
                        itemStyle: {
                            color: metbrewer[settings.palette].colours[idx]
                        }
                    }
                );
            });
        }
    } else {
        // Not small multiples
        myChart.resize({ height: window.innerHeight });
        var data = [];
        if (xBinned) {
            categories.slice().reverse().forEach(function (cat, idx) {
                data.push(Object.entries(store.filter(d => d[settings.colour] == cat).reduce(
                    function (acc, item) {
                        acc[item[settings.x]]++;
                        return (acc)
                    },
                    Object.fromEntries([...new Set(store.map(a => a[settings.x]))].sort().map(a => [a, 0])) // This is necessary for ordering of x axis
                )).sort(
                    (a, b) => a[0] - b[0]
                ).map(
                    e => [
                        e[0],
                        e[1],
                        metbrewer[settings.palette].colours[categories.indexOf(cat)],
                        'Count of ' + datasetTitle + 's',
                        cat,
                        null
                    ]
                ));
            });
        } else {
            categories.forEach(function (cat, idx) {
                data.push(store.filter(d => d[settings.colour] == cat).map(
                    d => [
                        d[settings.x],
                        d[settings.y],
                        metbrewer[settings.palette].colours[categories.indexOf(d[settings.colour])],
                        d[datasetIndex],
                        d[settings.colour],
                        d[datasetName]
                    ]
                ));
            });
        }
        categories.forEach(function (cat, idx) {
            series.push({
                type: xBinned ? 'bar' : 'scatter',
                name: labelExtremes(settings.colour, idx, categories.length - 1, String(cat)),
                id: idx,
                yAxisIndex: 0,
                xAxisIndex: 0,
                coordinateSystem: 'cartesian2d',
                data: data[idx],
                stack: xBinned ? 'x' : null,
                itemStyle: {
                    color: function (data) {
                        return data.value[2];
                    }
                },
            });
        });
        yAxis.push({
            id: 0,
            type: 'value',
            name: xBinned ? 'Count of ' + datasetTitle + 's' : useTitleIfExists(settings.y),
            show: true,
            min: yHasDataMin ? 'dataMin' : null,
            max: yHasDataMin ? 'dataMax' : null,
            axisLabel: {
                showMinLabel: yHasDataMin ? false : null,
                showMaxLabel: yHasDataMin ? false : null,
            },
        });
        xAxis.push({
            id: 0,
            type: xBinned ? 'category' : 'value',
            name: useTitleIfExists(settings.x),
            min: xHasDataMin ? 'dataMin' : null,
            max: xHasDataMin ? 'dataMax' : null,
            axisLabel: {
                showMinLabel: xHasDataMin ? false : null,
                showMaxLabel: xHasDataMin ? false : null,
                formatter: function (value, idx) {
                    return (labelExtremes(settings.x, idx, xCategories.length - 1, value));
                }
            },
        });
        grid.push({
            id: 0,
            left: '5%',
            right: '21%',
            top: '50',
            height: '90%',
        });
        titles.push({
            text: ''
        });
    }
    if (series.length < chartSeries) {
        for (var idx = series.length; idx < chartSeries; idx++) {
            series.push(
                {
                    type: 'scatter',
                    id: idx,
                    showSymbol: false,
                    data: [],
                    name: ''
                }
            );
        }
    }
    if (yAxis.length < chartAxes) {
        for (var idx = yAxis.length; idx < chartAxes; idx++) {
            yAxis.push({
                name: '',
                id: idx,
                axisLabel: { show: false },
                axisLine: { show: false },
                axisTick: { show: false }
            });
            xAxis.push({
                name: '',
                id: idx,
                axisLabel: { show: false },
                axisLine: { show: false },
                axisTick: { show: false }
            });
            grid.push({
                id: idx,
                left: '5%',
                right: '21%',
                top: '50',
                height: '0%',
                show: false
            });
            titles.push({
                text: ''
            });
        }
    }
    titles.push({ text: settings.chartTitle });
    chartSeries = series.length;
    chartAxes = yAxis.length;
    var legendData = [];
    categories.forEach(function (cat, idx) {
        legendData.push({
            name: labelExtremes(settings.colour, idx, categories.length - 1, String(cat)),
            itemStyle: { color: metbrewer[settings.palette].colours[idx] },
        });
    });
    myChart.setOption({
        title: titles,
        grid: grid,
        xAxis: xAxis,
        yAxis: yAxis,
        series: series,
        legend: {
            top: 'middle',
            right: 0,
            orient: 'vertical',
            align: 'right',
            icon: 'roundRect',
            data: legendData,
        },
    });

    // Add click event listener to the chart
    myChart.off('click'); // Remove any existing click listeners
    myChart.on('click', function(params) {
        console.log('clicked');
        if (params.componentType === 'series' && params.seriesType === 'scatter') {
            var content = `
                <strong>${params.seriesName}</strong><br>
                ${settings.x}: ${params.data[0]}<br>
                ${settings.y}: ${params.data[1]}
            `;
            document.getElementById('scatter-modal-content').innerHTML = content;
            scatterModalInstance.open();
        }
    });
}

// When the selectors change, update the chart options
function updateSelect(name, target) {
    if (target == 'x') {
        settings.x = name;
        // Hide relevant y options
        hideSelected("y-select", settings.x, settings.y, (dimensions[settings.x].type == 'Binned'));
        $('#y-select').formSelect();
    } else if (target == 'y') {
        settings.y = name;
        // Hide relevant x options
        hideSelected("x-select", (dimensions[settings.x].type == 'Binned') ? settings.y : 'Count of ' + datasetTitle + 's', settings.x);
        $('#x-select').formSelect();
    } else if (target == 'multiple') {
        settings.smallMultiple = name;
    } else if (target == 'colour') {
        settings.colour = name;
        const numCats = orderCategories(settings.colour).length;
        // Handle the case where the palette doesn't hold enough colours by hiding options and selecting an alternative
        var change = false;
        if (numCats > metbrewer[settings.palette].colours.length) {
            change = true;
        }
        var pselect = document.getElementById("palette-select");
        for (var i = 0; i < pselect.length; i++) {
            if (numCats > metbrewer[pselect[i].value].colours.length) {
                pselect[i].disabled = true;
                pselect[i].selected = false;
            } else {
                pselect[i].disabled = false;
                if (change) {
                    settings.palette = pselect[i].value;
                    pselect[i].selected = true;
                    change = false;
                }
            }
        }
        $('#palette-select').formSelect();
    } else if (target == 'palette') {
        settings.palette = name;
    } else {
        console.log('Unknown target');
    }
    updateChart();
}

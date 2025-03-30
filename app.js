// TODO: fill out Data Zones dataset - document/title the new variables and add extremes
// TODO: add choropleth map
// TODO: add hex map
// TODO: calculate columns as required
// TODO: load a column at a time from S3
// TODO: Add NIMDM travel data for small areas
// TODO: Allow users to choose an area to highlight on the charts

// Initialize the echarts instance based on the prepared dom
var myChart = echarts.init(document.getElementById('main'));
var store = null;
var dimensions = null;
var metbrewer = null;
var datasetURL = null;
var datasetTitle = null;
var datasetIndex = null;
var datasetDenominator = null;
var summaryVariables = [];
var settings = {};
var categories = [];
var isSmallMultiple = false;
var chartAxes = 0;
var chartSeries = 0;

// Initialize Shepherd tour
const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
        classes: 'shepherd-theme-default',
        scrollTo: false,
        modalOverlayOpeningPadding: 4
    }
});

// Add tour steps
tour.addStep({
    id: 'choose-variables',
    arrow: false,
    attachTo: {
        element: 'body',
        on: 'top'
    },
    text: 'Welcome to the <b>NI small area statistics explorer</b>, which allows you to compare statistics across different areas of Northern Ireland.<br>Use the pencil<i class="material-icons tiny" style="vertical-align: middle;">edit</i> icon top-right to open the Settings and customize the chart.',
    buttons: [
        {
            text: 'Next',
            action: tour.next
        },
        {
            text: 'Skip',
            action: function() {
                tour.complete();
                myChart.setOption({toolbox: {feature: {myTool1: {iconStyle: {borderWidth: 1, borderColor: '#808080'}}}}});
            }
        },
        {
            text: 'Don\'t show again',
            action: function() {
                tour.complete();
                localStorage.setItem('tourComplete', 'true');
                myChart.setOption({toolbox: {feature: {myTool1: {iconStyle: {borderWidth: 1, borderColor: '#808080'}}}}});
            }
        }
    ],
    popperOptions: {
        modifiers: [{
            name: 'offset',
            options: {
                offset: [30, 120]
            }
        }],
        placement: 'right-start',
        strategy: 'fixed'
    },
    when: {
        show: () => {
            // Draw box around toolbox icon
            myChart.setOption({toolbox: {feature: {myTool1: {iconStyle: {borderWidth: 2, borderColor: '#3288e6'}}}}});
        },
        hide: () => {
            // Remove box
            myChart.setOption({toolbox: {feature: {myTool1: {iconStyle: {borderWidth: 1, borderColor: '#808080'}}}}});
        }
    }
});

tour.addStep({
    id: 'x-axis-selection',
    arrow: false,
    attachTo: {
        element: 'body',
        on: 'top'
    },
    text: 'You can choose the variable for the X axis (highlighted in blue). This will update the chart, you can also change the y axis, colouring and create small charts based on categories or binned variables. Some variables have count and percentage options.',
    buttons: [
        {
            text: 'Back',
            action: () => {
                tour.back();
                document.getElementById('x-select').parentElement.parentElement.style.backgroundColor = 'rgba(255,255,255,0)';
            }
        },
        {
            text: 'Next',
            action: tour.next
        },
        {
            text: 'Exit',
            action: () => {
                tour.complete();
                document.getElementById('x-select').parentElement.parentElement.style.backgroundColor = 'rgba(255,255,255,0)';
            }
        }
    ],
    popperOptions: {
        modifiers: [{
            name: 'offset',
            options: {
                offset: [30, 120]
            }
        }],
        placement: 'right-start',
        strategy: 'fixed'
    },
    when: {
        show: () => {
            // Open the bottom sheet if it's not already open
            if (!bottomSheetInstance.isOpen) {
                bottomSheetInstance.open();
            }
            // Draw box around x-axis selector
            // Add a box around the x-axis selector
            document.getElementById('x-select').parentElement.parentElement.style.backgroundColor = '#e3f2fd';
        },
        hide: () => {
            // Remove box
            document.getElementById('x-select').parentElement.parentElement.style.backgroundColor = 'rgba(255,255,255,0)';
        }
    }
});

tour.addStep({
    id: 'quantile-selection',
    arrow: false,
    attachTo: {
        element: 'body',
        on: 'top'
    },
    text: 'You can choose how numerical variables are displayed (highlighted in blue), as <b>quantiles</b> (where the data is ranked and split into equal groups), <b>intervals</b> (where the data is split into equal sized ranges, useful for showing the distribution of values), or <b>ranks</b> (where each area is ranked against other areas).',
    buttons: [
        {
            text: 'Back',
            action: () => {
                tour.back();
                document.getElementById('x-quantile').parentElement.parentElement.parentElement.style.backgroundColor = 'rgba(255,255,255,0)';
            }
        },
        {
            text: 'Next',
            action: tour.next
        },
        {
            text: 'Exit',
            action: () => {
                tour.complete();
                document.getElementById('x-quantile').parentElement.parentElement.parentElement.style.backgroundColor = 'rgba(255,255,255,0)';
            }
        }
    ],
    popperOptions: {
        modifiers: [{
            name: 'offset',
            options: {
                offset: [30, 120]
            }
        }],
        placement: 'right-start',
        strategy: 'fixed'
    },
    when: {
        show: () => {
            // Open the bottom sheet if it's not already open
            if (!bottomSheetInstance.isOpen) {
                bottomSheetInstance.open();
            }
            // Draw box around x-axis selector
            // Add a box around the x-axis selector
            document.getElementById('x-quantile').parentElement.parentElement.parentElement.style.backgroundColor = '#e3f2fd';
        },
        hide: () => {
            // Remove box
            document.getElementById('x-quantile').parentElement.parentElement.parentElement.style.backgroundColor = 'rgba(255,255,255,0)';
        }
    }
});

tour.addStep({
    id: 'chart-actions',
    arrow: false,
    attachTo: {
        element: 'body',
        on: 'top'
    },
    text: 'You can use the highlighted icons to <b>download</b> the chart as an image, or to <b>copy</b> a URL you can use to share the chart via email or social media.<br>You can also click individual points in the scatter plot to <b>show more details</b> about that area, including a map.',
    buttons: [
        {
            text: 'Back',
            action: () => {
                tour.back();
                myChart.setOption({toolbox: {feature: {saveAsImage: {iconStyle: {borderWidth: 1, borderColor: '#808080'}}}}});
                myChart.setOption({toolbox: {feature: {myTool2: {iconStyle: {borderWidth: 1, borderColor: '#808080'}}}}});
            }
        },
        {
            text: 'Exit',
            action: () => {
                tour.complete();
                myChart.setOption({toolbox: {feature: {saveAsImage: {iconStyle: {borderWidth: 1, borderColor: '#808080'}}}}});
                myChart.setOption({toolbox: {feature: {myTool2: {iconStyle: {borderWidth: 1, borderColor: '#808080'}}}}});
            }
        }
    ],
    popperOptions: {
        modifiers: [{
            name: 'offset',
            options: {
                offset: [30, 120]
            }
        }],
        placement: 'right-start',
        strategy: 'fixed'
    },
    when: {
        show: () => {
            if (bottomSheetInstance.isOpen) {
                bottomSheetInstance.close();
            }
            myChart.setOption({toolbox: {feature: {saveAsImage: {iconStyle: {borderWidth: 2, borderColor: '#3288e6'}}}}});
            myChart.setOption({toolbox: {feature: {myTool2: {iconStyle: {borderWidth: 2, borderColor: '#3288e6'}}}}});
        },
        hide: () => {
            // Remove box
            myChart.setOption({toolbox: {feature: {saveAsImage: {iconStyle: {borderWidth: 1, borderColor: '#808080'}}}}});
            myChart.setOption({toolbox: {feature: {myTool2: {iconStyle: {borderWidth: 1, borderColor: '#808080'}}}}});
        }
    }
});

var bottomSheetInstance = M.Modal.init(document.getElementById('bottom-sheet'), {
    dismissible: true,
    inDuration: 250,
    outDuration: 200,
    preventScrolling: true,
    onOpenStart: function() {
        // Add a small delay to ensure proper modal positioning
        setTimeout(() => {
            document.body.style.overflow = 'hidden';
        }, 100);
    },
    onOpenEnd: function() {
        // Ensure modal is properly positioned
        bottomSheetInstance.el.style.transform = 'translateY(0)';
    },
    onCloseEnd: function() {
        document.body.style.overflow = 'auto';
    }
});
var infoModalInstance = M.Modal.init(document.getElementById('info-modal'), {
    dismissible: true,
    inDuration: 250,
    outDuration: 200,
    preventScrolling: true,
    onOpenStart: function() {
        document.body.style.overflow = 'hidden';
        // Prevent touch events from bubbling through
        document.getElementById('info-modal').addEventListener('touchmove', function(e) {
            e.stopPropagation();
        }, { passive: false });
    },
    onCloseEnd: function() {
        document.body.style.overflow = 'auto';
    }
});
var geoJSONPromise = null;
const params = new URLSearchParams(location.search);
if (params.get("metadataURL")) {
    settings.metadataURL = params.get("metadataURL");
} else {
    settings.metadataURL = "sa-metadata.json";
}
if (params.get("chartTitle") == "") {
    settings.chartTitle = "";
} else if (params.get("chartTitle")) {
    settings.chartTitle = params.get("chartTitle");
}

const mapContainer = document.getElementById('area-details-modal-map');
mapContainer.style.height = '300px';
mapContainer.innerHTML = '';

const map = L.map(mapContainer); // Center on Northern Ireland
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var geoJSONLayer = L.geoJSON(null).addTo(map);

function updateMetadata(metadata) {
    dimensions = metadata.dimensions;
    datasetURL = metadata.dataset;
    datasetTitle = metadata.title;
    datasetIndex = metadata.index;
    datasetName = metadata.name;
    datasetGeoJSON = metadata.geojson;
    datasetExploreURL = metadata.exploreURL;
    datasetExplorerName = metadata.explorerName;
    datasetDenominator = metadata.population;
    summaryVariables = metadata.summaryVariables;
    settings.chartTitle = "NI " + datasetTitle + " statistics explorer";
    return metadata;
}

// Create a promise for loading sa-dimensions.json
var dimensionsPromise = fetch(settings.metadataURL).then(
    response => response.json()
).then(
    d => updateMetadata(d)
);

var metbrewerPromise = fetch('metbrewer.json').then(response => response.json()).then(function (data) {
    metbrewer = data;
    return data;
});

myChart.showLoading();

const geographyOptions = [
    {
        value: 'Data Zone',
        URL: 'dz-metadata.json'
    },
    {
        value: 'Small Area',
        URL: 'sa-metadata.json'
    }
];

for (const geo of geographyOptions) {
    document.getElementById("geography-select").append(createOption(geo.value, geo.value, (geo.URL == settings.metadataURL)));
}

// Use Promise.all to wait for both promises to resolve
Promise.all([dimensionsPromise, metbrewerPromise]).then(function () {
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
        quoteChar: '"',        // Explicitly set quote character
        escapeChar: '"',       // Handle escaped quotes
        complete: d => onDataLoad(d)
    });
});

function initialiseDimensionSettings(params, dimensions) {
    // Take either x from URL params or default to first numeric dimension
    if (dimensions.hasOwnProperty(params.get("x"))) {
        settings.x = params.get("x");
    } else {
        settings.x = Object.entries(dimensions).filter(a => a[1].type == 'Rank' || a[1].type == 'Percentage' || a[1].type == 'Number' || a[1].type == 'People' || a[1].type == 'Calculated Percentage')[0][0];
    }
    // Take either y from URL params or default to second numeric dimension
    if (dimensions.hasOwnProperty(params.get("y"))) {
        settings.y = params.get("y");
    } else {
        settings.y = Object.entries(dimensions).filter(a => a[1].type == 'Rank' || a[1].type == 'Percentage' || a[1].type == 'Number' || a[1].type == 'People' || a[1].type == 'Calculated Percentage')[1][0];
    }
    // Take either colour from URL params or default to first category dimension
    if (dimensions.hasOwnProperty(params.get("colour"))) {
        settings.colour = params.get("colour");
    } else {
        settings.colour = Object.entries(dimensions).filter(a => a[1].type == 'Category')[0][0];
    }
    // Take either smallMultiple from URL params or default to none
    if (dimensions.hasOwnProperty(params.get("smallMultiple"))) {
        settings.smallMultiple = params.get("smallMultiple");
    } else {
        settings.smallMultiple = 'None';
    }
}

function calculateQuantileBins(name, suffix, bins) {
    const binSize = store.length / bins;

    store.map((a, idx) => ({
        index: idx,
        value: a[name]
    })).sort(
        (a, b) => (a.value - b.value)
    ).forEach((e, i) => {
        const value = parseInt(i / binSize) + 1;
        store[e.index][name + suffix] = value;
    });
}

function calculateIntervalBins(name, suffix, bins) {
    const values = store.map(a => a[name]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;

    store.forEach((item, idx) => {
        const value = Math.min(bins-1, Math.floor((item[name] - min) / binWidth));
        store[idx][name + suffix] = value+1;
    });
}

function calculateRanks(name, suffix) {
    store.map((a, idx) => ({
        index: idx,
        value: a[name]
    })).sort(
        (a, b) => (a.value - b.value)
    ).forEach((e, i) => {
        store[e.index][name + suffix] = i+1;
    });
}

// Percentages are selectable as a new variable rather than via a checbox
function calculatePercentages(name, suffix) {
    store.forEach(a => a[name + suffix] = 100 * a[name] / a[datasetDenominator]);
}

function variableHasCalculatedOptions(v) {
    var hasQuantile = false;
    var hasInterval = false;
    var hasRank = false;
    var hasPercentage = false;
    var suffixQuantile = null;
    var suffixInterval = null;
    var suffixRank = null;
    var suffixPercentage = null;
    if (v.bins && (v.type === 'Number' || v.type === 'Percentage' || v.type === 'Calculated Percentage' || v.type === 'People' || v.type === 'Quantile' || v.type === 'Rank')) {
        hasQuantile = true;
        suffixQuantile = (v.bins[0] == 10) ? ' decile' : (v.bins[0] == 100) ? ' centile' : ' quantile';
    }
    if (v.bins && (v.type === 'Number' || v.type === 'Percentage' || v.type === 'Calculated Percentage' || v.type === 'People')) {
        hasInterval = true;
        suffixInterval = ' interval';
    }
    if (v.type === 'Number' || v.type === 'Percentage' || v.type === 'Calculated Percentage' || v.type === 'People') {
        hasRank = true;
        suffixRank = ' rank';
    }
    if (v.type === 'People') {
        hasPercentage = true;
        suffixPercentage = ' (%)';
    }
    return [hasQuantile, hasInterval, hasRank, hasPercentage, suffixQuantile, suffixInterval, suffixRank, suffixPercentage];
}

function addCalculatedDimensions(d) {
    // Add extra calculated dimensions
    const name = d[0];
    const config = d[1];
    const [hasQuantile, hasInterval, hasRank, hasPercentage, suffixQuantile, suffixInterval, suffixRank, suffixPercentage] = variableHasCalculatedOptions(config);
    if (hasQuantile) {
        dimensions[(name + suffixQuantile)] = {
            ...config,
            type: 'Quantile',
            calcSource: name
        };
        if (config.description) {
            dimensions[(name + suffixQuantile)].description = config.description + suffixQuantile;
        }
        if (config.title) {
            dimensions[(name + suffixQuantile)].title = config.title + suffixQuantile;
        }
    }
    if (hasInterval) {
        dimensions[(name + suffixInterval)] = {
            ...config,
            type: 'Interval',
            calcSource: name
        };
        if (config.description) {
            dimensions[(name + suffixInterval)].description = config.description + suffixInterval;
        }
        if (config.title) {
            dimensions[(name + suffixInterval)].title = config.title + suffixInterval;
        }
    }
    if (hasRank) {
        dimensions[(name + suffixRank)] = {
            ...config,
            type: 'Calculated Rank',
            calcSource: name
        };
        if (config.description) {
            dimensions[(name + suffixRank)].description = config.description + suffixRank;
        }
        if (config.title) {
            dimensions[(name + suffixRank)].title = config.title + suffixRank;
        }
    }
    if (hasPercentage) {
        dimensions[(name + suffixPercentage)] = {
            ...config,
            type: 'Calculated Percentage',
            calcNumerator: name,
            calcDenominator: datasetDenominator
        };
        if (config.description) {
            dimensions[(name + suffixPercentage)].description = config.description + suffixPercentage;
        }
        if (config.title) {
            dimensions[(name + suffixPercentage)].title = config.title + suffixPercentage;
        }
    }
}

function onDataLoad(results) {
    // Create a promise for loading the GeoJSON file
    geoJSONPromise = fetch(datasetGeoJSON).then(response => response.json()).then(function (data) {
        geoJSONData = data;
        return data;
    });

    // Initialise the data store from the loaded data
    store = results.data.map(row => {
        // Convert each row to an object
        return Object.fromEntries(
            Object.entries(row).map(([key, value]) => {
                // Convert empty strings to null and fix column headers that Papa Parse has mangled
                return [key.replaceAll(/_\d+(?=,)/g, ''), value === "" ? null : value];
            })
        );
    }).sort((a, b) => b[datasetIndex] - a[datasetIndex]);

    // Add calculated dimensions (once for the whole dataset and again for the calculated percentage dimensions)
    Object.entries(dimensions).forEach((d) => addCalculatedDimensions(d));
    Object.entries(dimensions).filter(a => a[1].type == 'Calculated Percentage').forEach((d) => addCalculatedDimensions(d));
    // Initialise the dimension settings
    initialiseDimensionSettings(params, dimensions);

    updateChart();

    // Start the tour if it hasn't been shown before
    if (!localStorage.getItem('tourComplete')) {
        setTimeout(() => {
            tour.start();
        }, 1000); // Short delay to ensure chart is fully rendered
    }

    // Fill out the options in the selectors based on the dimensions of the dataset
    // Hide x options when selected for y and vice versa
    var ogxm = createOptGroup('Metrics');
    var ogym = createOptGroup('Metrics');
    var ogmc = createOptGroup('Categories');
    var ogmb = createOptGroup('Binned metrics');
    var ogcc = createOptGroup('Categories');
    var ogcb = createOptGroup('Binned metrics');
    for (const [key, value] of Object.entries(dimensions)) {
        if (value.type == 'Rank' || value.type == 'Percentage' || value.type == 'Geographic' || value.type == 'Number' || value.type == 'People' || value.type == 'Calculated Percentage') {
            ogxm.append(createOption(useTitleIfExists(key), key, (key == settings.x), (key == settings.y)));
            ogym.append(createOption(useTitleIfExists(key), key, (key == settings.y), (key == settings.x)));
        } else if (value.type == 'Category') {
            ogmc.append(createOption(useTitleIfExists(key), key, false, false));
            ogcc.append(createOption(useTitleIfExists(key), key, (key == settings.colour), false));
        } else if (value.type == 'Quantile' || value.type == 'Interval') {
            ogmb.append(createOption(useTitleIfExists(key), key, false, false));
            ogcb.append(createOption(useTitleIfExists(key), key, (key == settings.colour), false));
        }
    }
    ogym.append(createOption('Count of ' + datasetTitle + 's', 'Count of ' + datasetTitle + 's', false, true));
    document.getElementById("x-select").replaceChildren(ogxm);
    document.getElementById("y-select").replaceChildren(ogym);

    ogmc.append(createOption('None', 'None', true, false));

    document.getElementById("multiple-select").replaceChildren(ogmc, ogmb);
    document.getElementById("colour-select").replaceChildren(ogcc, ogcb);

    document.getElementById("palette-select").replaceChildren();
    for (const key of Object.keys(metbrewer)) {
        document.getElementById("palette-select").append(createOption(key, key, (key == settings.palette)));
    }
    handleXVariableChange(dimensions[settings.x].hasOwnProperty('calcSource') ? dimensions[settings.x].calcSource : settings.x, dimensions[settings.x].type == 'Quantile'), dimensions[settings.x].type == 'Interval', dimensions[settings.x].type == 'Calculated Rank';

    $('#x-select').select2({ width: '100%', matcher: matchWithOptGroups, dropdownParent: $("#bottom-sheet") });
    $('#y-select').select2({ width: '100%', matcher: matchWithOptGroups, dropdownParent: $("#bottom-sheet") });
    $('#colour-select').select2({ width: '100%', matcher: matchWithOptGroups, dropdownParent: $("#bottom-sheet") });
    $('#multiple-select').select2({ width: '100%', matcher: matchWithOptGroups, dropdownParent: $("#bottom-sheet") });
    $('#palette-select').select2({ width: '100%', dropdownParent: $("#bottom-sheet") });
    $('#geography-select').select2({ width: '100%', dropdownParent: $("#bottom-sheet") });

    // When the selectors change, update the chart options
    $('#multiple-select').on('select2:select', function (e) {
        settings.smallMultiple = e.target.value;
        updateChart();
    });

    $('#colour-select').on('select2:select', function (e) {
        settings.colour = e.target.value;
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
        $('#palette-select').trigger('change');
        updateChart();
    });

    $('#palette-select').on('select2:select', function (e) {
        settings.palette = e.target.value;
        updateChart();
    });

    $('#x-select').on('select2:select', function (e) {
        handleXVariableChange(e.target.value, document.getElementById('x-quantile').checked, document.getElementById('x-interval').checked, document.getElementById('x-rank').checked);
        updateChart();
    });

    $('#y-select').on('select2:select', function (e) {
        settings.y = e.target.value;
        const xBinned = dimensions[settings.x].type == 'Quantile' || dimensions[settings.x].type == 'Interval';
        hideSelected("x-select", xBinned ? 'Count of ' + datasetTitle + 's' : settings.y, settings.x);
        $('#x-select').trigger('change');
        updateChart();
    });

    $('#geography-select').on('select2:select', function (e) {
        settings.metadataURL = geographyOptions.find(a => a.value == e.target.value).URL;
        // First load the metadata
        $.get(settings.metadataURL)
            .done(function(metadataData) {
                updateMetadata(metadataData);
                // Load sa-stats.json with the dynamically constructed URL
                Papa.parse(datasetURL, {
                    download: true,
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    quoteChar: '"',        // Explicitly set quote character
                    escapeChar: '"',       // Handle escaped quotes
                    complete: d => onDataLoad(d)
                });
            })
            .fail(function(error) {
                console.error('Error loading data:', error);
            });
    });
}

function matchWithOptGroups(params, data) {
    // If there are no search terms, return all of the data
    if ($.trim(params.term) === '') {
        return data;
    }

    // Skip if there is no 'children' property
    if (typeof data.children === 'undefined') {
        return null;
    }

    // `data.children` contains the actual options that we are matching against
    var filteredChildren = [];
    $.each(data.children, function (idx, child) {
        if (child.text.toUpperCase().indexOf(params.term.toUpperCase()) > -1) {
            filteredChildren.push(child);
        }
    });

    // If we matched any of the timezone group's children, then set the matched children on the group
    // and return the group object
    if (filteredChildren.length) {
        var modifiedData = $.extend({}, data, true);
        modifiedData.children = filteredChildren;

        // You can return modified objects from here
        // This includes matching the `children` how you want in nested data sets
        return modifiedData;
    }

    // Return `null` if the term should not be displayed
    return null;
}

function tooltipCallback(args) {
    return (
        ((args.data[3] != 'Count of ' + datasetTitle + 's') ? (args.data[3] + ': ' + args.data[5] + '<br />') : '') +
        (dimensions[settings.x] ? useTitleIfExists(settings.x) : settings.x) + ': ' + (typeof args.data[0] === 'number' && !Number.isInteger(args.data[0]) ? args.data[0].toFixed(1) : args.data[0]) + (dimensions[settings.x].type == 'Percentage' || dimensions[settings.x].type == 'Calculated Percentage' ? '%' : '') + '<br />' +
        ((args.data[3] != 'Count of ' + datasetTitle + 's') ? (useTitleIfExists(settings.y) + ': ') : ('Count of ' + datasetTitle + 's: ')) + (typeof args.data[1] === 'number' && !Number.isInteger(args.data[1]) ? args.data[1].toFixed(1) : args.data[1]) + (dimensions[settings.y].type == 'Percentage' || dimensions[settings.y].type == 'Calculated Percentage' ? '%' : '') + '<br />' +
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
    if (dimensions[column] && dimensions[column].hasOwnProperty('title')) {
        return (dimensions[column].title);
    } else {
        return (column);
    }
}

function labelExtremes(column, idx, maxIdx, value) {
    const binned = dimensions[column].type == 'Quantile' || dimensions[column].type == 'Interval';
    if (binned && (dimensions[column].hasOwnProperty('extremes'))) {
        if (idx == 0) {
            return (value + ' - ' + dimensions[column].extremes[0]);
        } else if (idx == maxIdx) {
            return (value + ' - ' + dimensions[column].extremes[1]);
        }
    }
    return (value);
}

function orderCategories(column) {
    const binned = dimensions[column].type == 'Quantile' || dimensions[column].type == 'Interval';
    var cats = [...new Set(store.map(a => a[column]))];
    if (binned) {
        cats.sort((a, b) => parseInt(a) - parseInt(b));
    } else if (dimensions[column].hasOwnProperty('order')) {
        cats.sort((a, b) => dimensions[column].order.indexOf(a) - dimensions[column].order.indexOf(b));
    } else {
        cats.sort();
    }
    return (cats);
}

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
                    const xBinned = dimensions[settings.x].type == 'Quantile' || dimensions[settings.x].type == 'Interval';
                    showInfo('x-axis', settings.x);
                    showInfo('y-axis', xBinned ? 'Count of ' + datasetTitle + 's' : settings.y);
                    showInfo('small-multiples', settings.smallMultiple);
                    showInfo('colours', settings.colour);
                    showInfo('colour-scheme', settings.palette);
                    infoModalInstance.open();
                }
            }
        }
    },
    tooltip: {
        trigger: "item",
        formatter: tooltipCallback,
        alwaysShowContent: false,
        triggerOn: 'click',
        enterable: true,
        confine: true
    },
    touchMoveStopPropagation: true,
    animation: true
});

// Add a global click handler for the chart
myChart.getZr().on('click', function(params) {
    // Get click coordinates relative to canvas
    const pointInPixel = [params.offsetX, params.offsetY];

    // Check if click is in toolbox area
    if (myChart.containPixel('grid', pointInPixel)) {
        // Click was in main chart area
        return;
    }

    // If we get here, click was outside main chart area (potentially toolbox)
    // Prevent default behavior
    if (params.event) {
        params.event.preventDefault();
        params.event.stopPropagation();
    }
});

var areaDetailsModalInstance = M.Modal.init(document.getElementById('area-details-modal'));

function updateChart() {
    // Only calculate values that don't already exist in the store
    for (const dim of ([settings.x, settings.y, settings.colour, settings.smallMultiple].concat(summaryVariables))) {
        if ((dim in dimensions) && !(dim in store[0])) {
            if (dimensions[dim].type == 'Calculated Percentage') {
                const [_hasQuantile, _hasInterval, _hasRank, _hasPercentage, _suffixQuantile, _suffixInterval, _suffixRank, suffixPercentage] = variableHasCalculatedOptions(dimensions[dimensions[dim].calcNumerator]);
                calculatePercentages(dimensions[dim].calcNumerator, suffixPercentage);
            } else if (dimensions[dimensions[dim].calcSource].type == 'Calculated Percentage') {
                const [_hasQuantile, _hasInterval, _hasRank, _hasPercentage, _suffixQuantile, _suffixInterval, _suffixRank, suffixPercentage] = variableHasCalculatedOptions(dimensions[dimensions[dimensions[dim].calcSource].calcNumerator]);
                calculatePercentages(dimensions[dimensions[dim].calcSource].calcNumerator, suffixPercentage);
            }
            if (dimensions[dim].hasOwnProperty('calcSource')) {
                const [_hasQuantile, _hasInterval, _hasRank, _hasPercentage, suffixQuantile, suffixInterval, suffixRank, _suffixPercentage] = variableHasCalculatedOptions(dimensions[dimensions[dim].calcSource]);
                if (dimensions[dim].type == 'Quantile') {
                    calculateQuantileBins(dimensions[dim].calcSource, suffixQuantile, dimensions[dimensions[dim].calcSource].bins[0]);
                } else if (dimensions[dim].type == 'Interval') {
                    calculateIntervalBins(dimensions[dim].calcSource, suffixInterval, dimensions[dimensions[dim].calcSource].bins[0]);
                } else if (dimensions[dim].type == 'Calculated Rank') {
                    calculateRanks(dimensions[dim].calcSource, suffixRank);
                }
            }
        }
    }
    
    categories = orderCategories(settings.colour);
    isSmallMultiple = (settings.smallMultiple != 'None');
    var series = [];
    var yAxis = [];
    var xAxis = [];
    var grid = [];
    var titles = [];
    const xHasDataMin = dimensions[settings.x] ? (dimensions[settings.x].dataMin ? true : false) : false;
    const yHasDataMin = dimensions[settings.y] ? (dimensions[settings.y].dataMin ? true : false) : false;
    const yBinned = (dimensions[settings.y].type == 'Quantile' || dimensions[settings.y].type == 'Interval');
    const xBinned = (dimensions[settings.x].type == 'Quantile' || dimensions[settings.x].type == 'Interval');
    const colourBinned = (dimensions[settings.colour].type == 'Quantile' || dimensions[settings.colour].type == 'Interval');
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
            if (xBinned) {
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
    myChart.hideLoading();
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
    myChart.on('click', function (params) {
        if (params.componentType === 'series' && params.seriesType === 'scatter') {
            // Prevent immediate tooltip hide/show cycle
            setTimeout(() => {
                myChart.dispatchAction({
                    type: 'hideTip'
                });
            }, 0);

            // Add touch event handling
            if (params.event && params.event.event) {
                params.event.event.preventDefault();
                params.event.event.stopPropagation();
            }

            document.getElementById('area-details-modal-header').innerHTML = params.data[3] + ': ' + params.data[5];
            var content = `
                <strong>${useTitleIfExists(settings.colour)}:${params.data[4]}</strong><br>
                ${useTitleIfExists(settings.x)}: ${typeof params.data[0] === 'number' && !Number.isInteger(params.data[0]) ? params.data[0].toFixed(1) : params.data[0]}${dimensions[settings.x].type == 'Percentage' || dimensions[settings.x].type == 'Calculated Percentage' ? '%' : ''}<br>
                ${useTitleIfExists(settings.y)}: ${typeof params.data[1] === 'number' && !Number.isInteger(params.data[1]) ? params.data[1].toFixed(1) : params.data[1]}${dimensions[settings.y].type == 'Percentage' || dimensions[settings.y].type == 'Calculated Percentage' ? '%' : ''}
            `;
            document.getElementById('area-details-modal-point').innerHTML = content;

            if (datasetExplorerName) {
                document.getElementById('area-details-explorer-link').innerHTML = `More details on <a target="_blank" href="${datasetExploreURL.replace('{code}', params.data[3])}">${datasetExplorerName} for ${params.data[5]}&nbsp;<i class="material-icons tiny" style="vertical-align: middle;">open_in_new</i></a> `;
            } else {
                document.getElementById('area-details-explorer-link').innerHTML = '';
            }

            const fullDetails = store.filter(e => e[datasetIndex] == params.data[3])[0];

            let orderedFields = Object.keys(dimensions)
                .filter(key => summaryVariables.includes(key))
                .sort((a, b) => summaryVariables.indexOf(a) - summaryVariables.indexOf(b));

            var summaryTable = '<table class="striped"><tbody>';
            orderedFields.forEach(field => {
                if (fullDetails.hasOwnProperty(field)) {
                    summaryTable += `<tr><td>
                        ${useTitleIfExists(field)} (<a href=${dimensions[field].URL}>${dimensions[field].date}</a>)
                    </td><td>
                        ${typeof fullDetails[field] === 'number' && !Number.isInteger(fullDetails[field]) ? fullDetails[field].toFixed(1) : fullDetails[field]}${dimensions[field].type == 'Percentage' || dimensions[field].type == 'Calculated Percentage' ? '%' : ''}
                    </td></tr>`;
                }
            });
            summaryTable += '</tbody></table>';
            document.getElementById('area-details-modal-summary').innerHTML = summaryTable;
            // Get the relevant row from the geoJSON promise
            geoJSONPromise.then(function (geoJSONData) {
                const relevantFeature = geoJSONData.features.find(feature => feature.properties[datasetIndex] === params.data[3]);

                if (relevantFeature) {
                    map.removeLayer(geoJSONLayer);
                    geoJSONLayer = L.geoJSON(relevantFeature, {
                        style: {
                            color: "#ff7800",
                            weight: 2,
                            opacity: 0.65
                        }
                    }).addTo(map);
                    map.fitBounds(geoJSONLayer.getBounds());
                } else {
                    document.getElementById('area-details-modal-map').innerHTML = 'Map data not available for this area.';
                }
            });

            areaDetailsModalInstance.open();

            document.getElementById('area-details-modal').scrollTop = 0;
        }
    });
}

function handleXVariableChange(selected, quantileSelected, intervalSelected, rankSelected) {
    const dim = dimensions[selected];
    const [hasQuantile, hasInterval, hasRank, _hasPercentage, suffixQuantile, suffixInterval, suffixRank, _suffixPercentage] = variableHasCalculatedOptions(dim);
    // Make checkboxes selectable/non-selectable
    document.getElementById('x-quantile').disabled = !hasQuantile;
    document.getElementById('x-interval').disabled = !hasInterval;
    document.getElementById('x-rank').disabled = !hasRank;
    // Set the checkboxes to the correct state
    document.getElementById('x-quantile').checked = hasQuantile && quantileSelected;
    document.getElementById('x-interval').checked = hasInterval && intervalSelected;
    document.getElementById('x-rank').checked = hasRank && rankSelected;
    // Set the x variable to the correct value
    settings.x = selected;
    if (quantileSelected && hasQuantile) {
        settings.x = selected + suffixQuantile;
    }
    if (intervalSelected && hasInterval) {
        settings.x = selected + suffixInterval;
    }
    if (rankSelected && hasRank) {
        settings.x = selected + suffixRank;
    }
    // Hide the y variable if it's the same as the x variable
    hideSelected("y-select", selected, settings.y, (quantileSelected && hasQuantile) || (intervalSelected && hasInterval));
    // Hide the x variable if it's the same as the y variable
    hideSelected("x-select", (quantileSelected && hasQuantile) || (intervalSelected && hasInterval) ? 'Count of ' + datasetTitle + 's' : settings.y, selected);
    // Update the y variable selector
    $('#y-select').trigger('change');
    // Update the x variable selector
    $('#x-select').trigger('change');
}

// Add event listeners for the checkboxes
document.querySelectorAll('.x-option').forEach(element => {
    element.addEventListener('change', function (e) {
        // If this checkbox was checked, uncheck the others
        if (e.target.checked) {
            document.querySelectorAll('.x-option').forEach(checkbox => {
                if (checkbox !== e.target) {
                    checkbox.checked = false;
                }
            });
        }
        handleXVariableChange(
            document.getElementById('x-select').value,
            document.getElementById('x-quantile').checked,
            document.getElementById('x-interval').checked,
            document.getElementById('x-rank').checked
        );
        updateChart();
    });
});

document.getElementById('bottom-sheet').addEventListener('submit', function(event) {
    event.preventDefault();
    M.Modal.getInstance(document.getElementById('bottom-sheet')).close();
});

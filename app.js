// TODO: fill out Data Zones dataset - remove all the Other columns
// TODO: add new category variables - side of the bann/white water and urban/rural (maybe deprivation/target areas)
// TODO: check NISRA for other DZ/SDZ data
// TODO: try a multi-variable analysis
// TODO: wrap long x and y axis captions
// TODO: add title to legend (or colour to title)
// TODO: more examples (education/job category/industry)
// TODO: more geographies (DEA/Ward)
// TODO: add hex map
// TODO: Add NIMDM travel data for small areas
// TODO: Allow users to choose an area to highlight on the charts

// Initialize the echarts instance based on the prepared dom
var myChart = echarts.init(document.getElementById('main'));
var store = null;
var metbrewer = null;
var dataset = {
    title: null,
    index: null,
    URL: null,
    denominator: null,
    summaryVariables: [],
    dimensions: null
};
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
    text: 'You can use the highlighted icons to <b>download</b><i class="material-icons tiny" style="vertical-align: middle;">download</i> the chart as an image, or to <b>copy</b><i class="material-icons tiny" style="vertical-align: middle;">content_copy</i> a URL you can use to share the chart via email or social media.<br>You can also click individual points in the scatter plot to <b>show more details</b> about that area, including a map.',
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
    settings.metadataURL = "dz-metadata.json";
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
    dataset = metadata;
    settings.chartTitle = "NI " + dataset.title + " statistics explorer";
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
    },
    {
        value: 'District Electoral Area',
        URL: 'dea-metadata.json'
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
    Papa.parse(dataset.dataset, {
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
        settings.x = Object.entries(dimensions).filter(a => a[1].type == 'Rank' || a[1].type == 'Percentage' || a[1].type == 'Number' || a[1].type == 'People' || a[1].type == 'Calculated Percentage' || a[1].type == 'Households')[0][0];
    }
    // Take either y from URL params or default to second numeric dimension
    if (dimensions.hasOwnProperty(params.get("y"))) {
        settings.y = params.get("y");
    } else {
        settings.y = Object.entries(dimensions).filter(a => a[1].type == 'Rank' || a[1].type == 'Percentage' || a[1].type == 'Number' || a[1].type == 'People' || a[1].type == 'Calculated Percentage' || a[1].type == 'Households')[1][0];
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
    // Show map if in URL params
    if (params.get("showMap")) {
        settings.showMap = params.get("showMap");
    } else {
        settings.showMap = false;
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
function calculatePercentages(numerator, denominator, suffix) {
    store.forEach(a => a[numerator + suffix] = 100 * a[numerator] / a[denominator]);
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
    if (v.bins && (v.type === 'Number' || v.type === 'Percentage' || v.type === 'Calculated Percentage' || v.type === 'People' || v.type === 'Households')) {
        hasQuantile = true;
        suffixQuantile = (v.bins[0] == 10) ? ' decile' : (v.bins[0] == 100) ? ' centile' : ' quantile';
    }
    if (v.bins && (v.type === 'Number' || v.type === 'Percentage' || v.type === 'Calculated Percentage' || v.type === 'People' || v.type === 'Households')) {
        hasInterval = true;
        suffixInterval = ' interval';
    }
    if (v.type === 'Number' || v.type === 'Percentage' || v.type === 'Calculated Percentage' || v.type === 'People' || v.type === 'Households') {
        hasRank = true;
        suffixRank = ' rank';
    }
    if (v.type === 'People' || v.type === 'Households') {
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
        dataset.dimensions[(name + suffixQuantile)] = {
            ...config,
            type: 'Quantile',
            calcSource: name
        };
        if (config.description) {
            dataset.dimensions[(name + suffixQuantile)].description = config.description + suffixQuantile;
        }
        if (config.title) {
            dataset.dimensions[(name + suffixQuantile)].title = config.title + suffixQuantile;
        }
    }
    if (hasInterval) {
        dataset.dimensions[(name + suffixInterval)] = {
            ...config,
            type: 'Interval',
            calcSource: name
        };
        if (config.description) {
            dataset.dimensions[(name + suffixInterval)].description = config.description + suffixInterval;
        }
        if (config.title) {
            dataset.dimensions[(name + suffixInterval)].title = config.title + suffixInterval;
        }
    }
    if (hasRank) {
        dataset.dimensions[(name + suffixRank)] = {
            ...config,
            type: 'Calculated Rank',
            calcSource: name
        };
        if (config.description) {
            dataset.dimensions[(name + suffixRank)].description = config.description + suffixRank;
        }
        if (config.title) {
            dataset.dimensions[(name + suffixRank)].title = config.title + suffixRank;
        }
    }
    if (hasPercentage) {
        dataset.dimensions[(name + suffixPercentage)] = {
            ...config,
            type: 'Calculated Percentage',
            calcNumerator: name,
            calcDenominator: config.type == 'Households' ? dataset.households : dataset.population
        };
        if (config.description) {
            dataset.dimensions[(name + suffixPercentage)].description = config.description + suffixPercentage;
        }
        if (config.title) {
            dataset.dimensions[(name + suffixPercentage)].title = config.title + suffixPercentage;
        }
    }
}

function adjustAvailablePalettes(numCats, palette) {
    // Handle the case where the palette doesn't hold enough colours by hiding options and selecting an alternative
    var change = false;
    if (numCats > metbrewer[palette].colours.length) {
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
                palette = pselect[i].value;
                pselect[i].selected = true;
                change = false;
            }
        }
    }
    $('#palette-select').trigger('change');
    return palette;
}

function onDataLoad(results) {
    // Create a promise for loading the GeoJSON file
    geoJSONPromise = fetch(dataset.geojson).then(response => response.json()).then(function (data) {
        geoJSONData = data;
        geoJSONData.features = geoJSONData.features.map(feature => {
            feature.properties.name = feature.properties[dataset.hasOwnProperty('geojsonIndex') ? dataset.geojsonIndex : dataset.index];
            return feature;
        });
        echarts.registerMap(dataset.name, geoJSONData);
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
    }).sort((a, b) => b[dataset.index] - a[dataset.index]);

    // Add calculated dimensions (once for the whole dataset and again for the calculated percentage dimensions)
    Object.entries(dataset.dimensions).forEach((d) => addCalculatedDimensions(d));
    Object.entries(dataset.dimensions).filter(a => a[1].type == 'Calculated Percentage').forEach((d) => addCalculatedDimensions(d));

    document.getElementById("palette-select").replaceChildren();
    for (const key of Object.keys(metbrewer)) {
        document.getElementById("palette-select").append(createOption(key, key, (key == settings.palette)));
    }

    // Initialise the dimension settings
    initialiseDimensionSettings(params, dataset.dimensions);

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
    for (const [key, value] of Object.entries(dataset.dimensions)) {
        const [hasQuantile, hasInterval, _hasRank, hasPercentage, _suffixQuantile, _suffixInterval, _suffixRank, _suffixPercentage] = variableHasCalculatedOptions(value);
        if (value.type == 'Rank' || value.type == 'Percentage' || value.type == 'Geographic' || value.type == 'Number' || value.type == 'People' || value.type == 'Calculated Percentage' || value.type == 'Households') {
            ogxm.append(createOption(useTitleIfExists(key), key, (key == settings.x), (key == settings.y)));
            ogym.append(createOption(useTitleIfExists(key), key, (key == settings.y), (key == settings.x)));
        } else if (value.type == 'Category') {
            ogmc.append(createOption(useTitleIfExists(key), key, false, false));
            ogcc.append(createOption(useTitleIfExists(key), key, (key == settings.colour), false));
        }
        // Add variable to colour/small multiple options if it's binned
        if ((hasQuantile || hasInterval) && (value.type != 'Calculated Percentage')) {
            ogmb.append(createOption(useTitleIfExists(key), key, false, false));
            ogcb.append(createOption(useTitleIfExists(key), key, (key == settings.colour), false));
        }
    }
    ogym.append(createOption('Count of ' + dataset.title + 's', 'Count of ' + dataset.title + 's', false, true));
    document.getElementById("x-select").replaceChildren(ogxm);
    document.getElementById("y-select").replaceChildren(ogym);

    ogmc.append(createOption('None', 'None', true, false));

    document.getElementById("multiple-select").replaceChildren(ogmc, ogmb);
    document.getElementById("colour-select").replaceChildren(ogcc, ogcb);

    handleXVariableChange(
        dataset.dimensions[settings.x].hasOwnProperty('calcSource') ? dataset.dimensions[settings.x].calcSource : settings.x, 
        dataset.dimensions[settings.x].type == 'Quantile', 
        dataset.dimensions[settings.x].type == 'Interval', 
        dataset.dimensions[settings.x].type == 'Calculated Rank'
    );
    settings.colour = handleColourOrMultipleVariableChange(
        'colour',
        dataset.dimensions[settings.colour].hasOwnProperty('calcNumerator') ? 
            dataset.dimensions[settings.colour].calcNumerator : 
            (dataset.dimensions[settings.colour].hasOwnProperty('calcSource') ? 
                dataset.dimensions[settings.colour].calcSource : 
                settings.colour), 
        dataset.dimensions[settings.colour].type == 'Quantile', 
        dataset.dimensions[settings.colour].type == 'Interval', 
        dataset.dimensions[settings.colour].type == 'Calculated Percentage'
    );
    settings.smallMultiple = handleColourOrMultipleVariableChange(
        'multiple',
        ((settings.smallMultiple in dataset.dimensions) && dataset.dimensions[settings.smallMultiple].hasOwnProperty('calcNumerator')) ? 
            dataset.dimensions[settings.smallMultiple].calcNumerator : 
            (((settings.smallMultiple in dataset.dimensions) && dataset.dimensions[settings.smallMultiple].hasOwnProperty('calcSource')) ? 
                dataset.dimensions[settings.smallMultiple].calcSource : 
                settings.smallMultiple), 
        (settings.smallMultiple in dataset.dimensions) && (dataset.dimensions[settings.smallMultiple].type == 'Quantile'), 
        (settings.smallMultiple in dataset.dimensions) && (dataset.dimensions[settings.smallMultiple].type == 'Interval'), 
        (settings.smallMultiple in dataset.dimensions) && (dataset.dimensions[settings.smallMultiple].type == 'Calculated Percentage')
    );

    $('#x-select').select2({ width: '100%', matcher: matchWithOptGroups, dropdownParent: $("#bottom-sheet") });
    $('#y-select').select2({ width: '100%', matcher: matchWithOptGroups, dropdownParent: $("#bottom-sheet") });
    $('#colour-select').select2({ width: '100%', matcher: matchWithOptGroups, dropdownParent: $("#bottom-sheet") });
    $('#multiple-select').select2({ width: '100%', matcher: matchWithOptGroups, dropdownParent: $("#bottom-sheet") });
    $('#palette-select').select2({ width: '100%', dropdownParent: $("#bottom-sheet") });
    $('#geography-select').select2({ width: '100%', dropdownParent: $("#bottom-sheet") });

    // When the selectors change, update the chart options
    $('#multiple-select').on('select2:select', function (e) {
        settings.smallMultiple = handleColourOrMultipleVariableChange(
            'multiple',
            e.target.value,
            document.getElementById('multiple-quantile').checked,
            document.getElementById('multiple-interval').checked,
            document.getElementById('multiple-percentage').checked
        );
        updateChart();
    });

    $('#colour-select').on('select2:select', function (e) {
        settings.colour = handleColourOrMultipleVariableChange(
            'colour',
            e.target.value,
            document.getElementById('colour-quantile').checked,
            document.getElementById('colour-interval').checked,
            document.getElementById('colour-percentage').checked
        );
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
        const xBinned = dataset.dimensions[settings.x].type == 'Quantile' || dataset.dimensions[settings.x].type == 'Interval';
        hideSelected("x-select", xBinned ? 'Count of ' + dataset.title + 's' : settings.y, settings.x);
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
                Papa.parse(dataset.dataset, {
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
    var content = '';
    if (settings.showMap) {
        content = args.name + ': ' + args.data.areaName + '<br />' + useTitleIfExists(settings.colour) + ': ' + args.data.category;
    } else {
        content = ((args.data[3] != 'Count of ' + dataset.title + 's') ? (args.data[3] + ': ' + args.data[5] + '<br />') : '') +
            (dataset.dimensions[settings.x] ? useTitleIfExists(settings.x) : settings.x) + ': ' + (typeof args.data[0] === 'number' && !Number.isInteger(args.data[0]) ? args.data[0].toFixed(1) : args.data[0]) + (dataset.dimensions[settings.x].type == 'Percentage' || dataset.dimensions[settings.x].type == 'Calculated Percentage' ? '%' : '') + '<br />' +
            ((args.data[3] != 'Count of ' + dataset.title + 's') ? (useTitleIfExists(settings.y) + ': ') : ('Count of ' + dataset.title + 's: ')) + (typeof args.data[1] === 'number' && !Number.isInteger(args.data[1]) ? args.data[1].toFixed(1) : args.data[1]) + (dataset.dimensions[settings.y].type == 'Percentage' || dataset.dimensions[settings.y].type == 'Calculated Percentage' ? '%' : '') + '<br />' +
            args.marker + ' ' + useTitleIfExists(settings.colour) + ': ' + args.data[4];
    }

    return (content);
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
        if (select[i].value == 'Count of ' + dataset.title + 's') {
            select[i].disabled = !showCount;
            select[i].selected = showCount;
        } else {
            select[i].disabled = (select[i].value == hide) || (showCount);
            select[i].selected = (select[i].value == selected) && (!showCount);
        }
    }
}

function useTitleIfExists(column) {
    if (dataset.dimensions[column] && dataset.dimensions[column].hasOwnProperty('title')) {
        return (dataset.dimensions[column].title);
    } else {
        return (column);
    }
}

function labelExtremes(column, idx, maxIdx, value) {
    const binned = dataset.dimensions[column].type == 'Quantile' || dataset.dimensions[column].type == 'Interval';
    if (binned && (dataset.dimensions[column].hasOwnProperty('extremes'))) {
        if (idx == 0) {
            return (value + ' - ' + dataset.dimensions[column].extremes[0]);
        } else if (idx == maxIdx) {
            return (value + ' - ' + dataset.dimensions[column].extremes[1]);
        }
    }
    return (value);
}

function orderCategories(column) {
    const binned = dataset.dimensions[column].type == 'Quantile' || dataset.dimensions[column].type == 'Interval';
    var cats = [...new Set(store.map(a => a[column]))];
    if (binned) {
        cats.sort((a, b) => parseInt(a) - parseInt(b));
    } else if (dataset.dimensions[column].hasOwnProperty('order')) {
        cats.sort((a, b) => dataset.dimensions[column].order.indexOf(a) - dataset.dimensions[column].order.indexOf(b));
    } else {
        cats.sort();
    }
    return (cats);
}

function showInfo(item, variable) {
    if (dataset.dimensions.hasOwnProperty(variable)) {
        document.getElementById(item + '-info').innerHTML = dataset.dimensions[variable].description;
        document.getElementById(item + '-url').innerHTML = '<a href="' + dataset.dimensions[variable].URL + '" target="_blank">' + dataset.dimensions[variable].date + '</a>';
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
                    const xBinned = dataset.dimensions[settings.x].type == 'Quantile' || dataset.dimensions[settings.x].type == 'Interval';
                    showInfo('x-axis', settings.x);
                    showInfo('y-axis', xBinned ? 'Count of ' + dataset.title + 's' : settings.y);
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
    // Check if click is in toolbox area
    if (myChart.containPixel('grid', [params.offsetX, params.offsetY])) {
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
    for (const dim of ([settings.x, settings.y, settings.colour, settings.smallMultiple].concat(dataset.summaryVariables))) {
        if ((dim in dataset.dimensions) && !(dim in store[0])) {
            if (dataset.dimensions[dim].type == 'Calculated Percentage') {
                const [_hasQuantile, _hasInterval, _hasRank, _hasPercentage, _suffixQuantile, _suffixInterval, _suffixRank, suffixPercentage] = variableHasCalculatedOptions(dataset.dimensions[dataset.dimensions[dim].calcNumerator]);
                calculatePercentages(dataset.dimensions[dim].calcNumerator, dataset.dimensions[dim].calcDenominator, suffixPercentage);
            } else if (dataset.dimensions[dataset.dimensions[dim].calcSource].type == 'Calculated Percentage') {
                const [_hasQuantile, _hasInterval, _hasRank, _hasPercentage, _suffixQuantile, _suffixInterval, _suffixRank, suffixPercentage] = variableHasCalculatedOptions(dataset.dimensions[dataset.dimensions[dataset.dimensions[dim].calcSource].calcNumerator]);
                calculatePercentages(dataset.dimensions[dataset.dimensions[dim].calcSource].calcNumerator, dataset.dimensions[dataset.dimensions[dim].calcSource].calcDenominator, suffixPercentage);
            }
            if (dataset.dimensions[dim].hasOwnProperty('calcSource')) {
                const [_hasQuantile, _hasInterval, _hasRank, _hasPercentage, suffixQuantile, suffixInterval, suffixRank, _suffixPercentage] = variableHasCalculatedOptions(dataset.dimensions[dataset.dimensions[dim].calcSource]);
                if (dataset.dimensions[dim].type == 'Quantile') {
                    calculateQuantileBins(dataset.dimensions[dim].calcSource, suffixQuantile, dataset.dimensions[dataset.dimensions[dim].calcSource].bins[0]);
                } else if (dataset.dimensions[dim].type == 'Interval') {
                    calculateIntervalBins(dataset.dimensions[dim].calcSource, suffixInterval, dataset.dimensions[dataset.dimensions[dim].calcSource].bins[0]);
                } else if (dataset.dimensions[dim].type == 'Calculated Rank') {
                    calculateRanks(dataset.dimensions[dim].calcSource, suffixRank);
                }
            }
        }
    }
    // Make sure the correct palette options are available for the colour variable, once we have the fata loaded
    categories = orderCategories(settings.colour);
    settings.palette = adjustAvailablePalettes(categories.length, settings.palette);

    isSmallMultiple = (settings.smallMultiple != 'None') && (!settings.showMap);
    var series = [];
    var yAxis = [];
    var xAxis = [];
    var grid = [];
    var titles = [];
    const xHasDataMin = dataset.dimensions[settings.x] ? (dataset.dimensions[settings.x].dataMin ? true : false) : false;
    const yHasDataMin = dataset.dimensions[settings.y] ? (dataset.dimensions[settings.y].dataMin ? true : false) : false;
    const yBinned = (dataset.dimensions[settings.y].type == 'Quantile' || dataset.dimensions[settings.y].type == 'Interval');
    const xBinned = (dataset.dimensions[settings.x].type == 'Quantile' || dataset.dimensions[settings.x].type == 'Interval');
    const colourBinned = (dataset.dimensions[settings.colour].type == 'Quantile' || dataset.dimensions[settings.colour].type == 'Interval');
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
                            'Count of ' + dataset.title + 's',
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
                        d[dataset.index],
                        labelExtremes(settings.colour, categories.indexOf(d[settings.colour]), categories.length - 1, d[settings.colour]),
                        d[dataset.name]
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
                show: true,
                name: xBinned ? 'Count of ' + dataset.title + 's' : useTitleIfExists(settings.y),
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
                show: true,
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
        if (xBinned && !settings.showMap) {
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
                        'Count of ' + dataset.title + 's',
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
                        d[dataset.index],
                        d[settings.colour],
                        d[dataset.name]
                    ]
                ));
            });
        }
        categories.forEach(function (cat, idx) {
            series.push({
                type: settings.showMap ? 'map' : (xBinned ? 'bar' : 'scatter'),
                name: labelExtremes(settings.colour, idx, categories.length - 1, String(cat)),
                id: idx,
                yAxisIndex: 0,
                xAxisIndex: 0,
                coordinateSystem: 'cartesian2d',
                roam: settings.showMap,
                map: settings.showMap ? dataset.name : null,
                data: settings.showMap ? store.map(item => ({
                    name: item[dataset.index],
                    category: item[settings.colour],
                    areaName: item[dataset.name],
                    itemStyle: {
                        areaColor: metbrewer[settings.palette].colours[categories.indexOf(item[settings.colour])],
                    }
                })) : data[idx],
                select: {
                    disabled: true,
                    label: {
                        show: false
                    }
                },
                stack: (!settings.showMap && xBinned) ? 'x' : null,
                itemStyle: settings.showMap ? { borderColor: '#ccc', borderWidth: 0.5 } : {
                    color: function (data) {
                        return data.value[2];
                    }
                },
            });
        });
        yAxis.push({
            id: 0,
            type: 'value',
            name: xBinned ? 'Count of ' + dataset.title + 's' : useTitleIfExists(settings.y),
            show: settings.showMap ? false : true,
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
            show: settings.showMap ? false : true,
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
            itemStyle: { color: metbrewer[settings.palette].colours[idx], borderWidth: 0 },
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
        if ((params.componentType === 'series' && params.seriesType === 'scatter') || (params.componentType === 'series' && params.seriesType === 'map')) {
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

            const code = settings.showMap ? params.data.name : params.data[3];
            const name = settings.showMap ? params.data.areaName : params.data[5];
            const colour = settings.showMap ? params.data.category : params.data[4];
            const x = settings.showMap ? null : params.data[0];
            const y = settings.showMap ? null : params.data[1];

            document.getElementById('area-details-modal-header').innerHTML = code + ': ' + name;
            var content = `<strong>${useTitleIfExists(settings.colour)}:${colour}</strong><br>`;
            if (!settings.showMap) {
                content += `
                    ${useTitleIfExists(settings.x)}: ${typeof x === 'number' && !Number.isInteger(x) ? x.toFixed(1) : x}${dataset.dimensions[settings.x].type == 'Percentage' || dataset.dimensions[settings.x].type == 'Calculated Percentage' ? '%' : ''}<br>
                    ${useTitleIfExists(settings.y)}: ${typeof y === 'number' && !Number.isInteger(y) ? y.toFixed(1) : y}${dataset.dimensions[settings.y].type == 'Percentage' || dataset.dimensions[settings.y].type == 'Calculated Percentage' ? '%' : ''}
                `;
            }
            document.getElementById('area-details-modal-point').innerHTML = content;

            if (dataset.explorerName) {
                document.getElementById('area-details-explorer-link').innerHTML = `More details on <a target="_blank" href="${dataset.exploreURL.replace('{code}', code)}">${dataset.explorerName} for ${name}&nbsp;<i class="material-icons tiny" style="vertical-align: middle;">open_in_new</i></a> `;
            } else {
                document.getElementById('area-details-explorer-link').innerHTML = '';
            }

            const fullDetails = store.filter(e => e[dataset.index] == code)[0];

            let orderedFields = Object.keys(dataset.dimensions)
                .filter(key => dataset.summaryVariables.includes(key))
                .sort((a, b) => dataset.summaryVariables.indexOf(a) - dataset.summaryVariables.indexOf(b));

            var summaryTable = '<table class="striped"><tbody>';
            orderedFields.forEach(field => {
                if (fullDetails.hasOwnProperty(field)) {
                    summaryTable += `<tr><td>
                        ${useTitleIfExists(field)} (<a href=${dataset.dimensions[field].URL}>${dataset.dimensions[field].date}</a>)
                    </td><td>
                        ${typeof fullDetails[field] === 'number' && !Number.isInteger(fullDetails[field]) ? fullDetails[field].toFixed(1) : fullDetails[field]}${dataset.dimensions[field].type == 'Percentage' || dataset.dimensions[field].type == 'Calculated Percentage' ? '%' : ''}
                    </td></tr>`;
                }
            });
            summaryTable += '</tbody></table>';
            document.getElementById('area-details-modal-summary').innerHTML = summaryTable;
            // Get the relevant row from the geoJSON promise
            geoJSONPromise.then(function (geoJSONData) {
                const relevantFeature = geoJSONData.features.find(feature => feature.properties[dataset.hasOwnProperty('geojsonIndex') ? dataset.geojsonIndex : dataset.index] === code);

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
    const dim = dataset.dimensions[selected];
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
    hideSelected("x-select", (quantileSelected && hasQuantile) || (intervalSelected && hasInterval) ? 'Count of ' + dataset.title + 's' : settings.y, selected);
    // Update the y variable selector
    $('#y-select').trigger('change');
    // Update the x variable selector
    $('#x-select').trigger('change');
}

function handleColourOrMultipleVariableChange(variable, selected, quantileSelected, intervalSelected, percentageSelected) {
    if (selected in dataset.dimensions) {
        const [hasQuantile, hasInterval, _hasRank, hasPercentage, suffixQuantile, suffixInterval, _suffixRank, suffixPercentage] = variableHasCalculatedOptions(dataset.dimensions[selected]);
        // Make checkboxes selectable/non-selectable
        document.getElementById(variable+'-quantile').disabled = !hasQuantile;
        document.getElementById(variable+'-interval').disabled = !hasInterval;
        document.getElementById(variable+'-percentage').disabled = !hasPercentage;
        // Set the checkboxes to the correct state
        document.getElementById(variable+'-quantile').checked = hasQuantile && (quantileSelected || !intervalSelected);
        document.getElementById(variable+'-interval').checked = hasInterval && intervalSelected;
        document.getElementById(variable+'-percentage').checked = hasPercentage && percentageSelected;
        // Set the colour variable to the correct value
        if (percentageSelected && hasPercentage) {
            selected += suffixPercentage;
        }
        if ((quantileSelected || !intervalSelected) && hasQuantile) {
            selected += suffixQuantile;
        }
        if (intervalSelected && hasInterval) {
            selected += suffixInterval;
        }
    }
    return selected;
}

// Add event listeners for the x axis checkboxes
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

// Add event listeners for the colour options checkboxes
document.querySelectorAll('.colour-option').forEach(element => {
    element.addEventListener('change', function (e) {
        // If this checkbox was checked, uncheck the others
        if (e.target.id == 'colour-quantile') {
            document.getElementById('colour-interval').checked = !e.target.checked;
        } else if (e.target.id == 'colour-interval') {
            document.getElementById('colour-quantile').checked = !e.target.checked;
        }
        settings.colour = handleColourOrMultipleVariableChange(
            'colour',
            document.getElementById('colour-select').value,
            document.getElementById('colour-quantile').checked,
            document.getElementById('colour-interval').checked,
            document.getElementById('colour-percentage').checked
        );
        updateChart();
    });
});

// Add event listeners for the small multiple options checkboxes
document.querySelectorAll('.multiple-option').forEach(element => {
    element.addEventListener('change', function (e) {
        // If this checkbox was checked, uncheck the others
        if (e.target.id == 'multiple-quantile') {
            document.getElementById('multiple-interval').checked = !e.target.checked;
        } else if (e.target.id == 'multiple-interval') {
            document.getElementById('multiple-quantile').checked = !e.target.checked;
        }
        settings.smallMultiple = handleColourOrMultipleVariableChange(
            'multiple',
            document.getElementById('multiple-select').value,
            document.getElementById('multiple-quantile').checked,
            document.getElementById('multiple-interval').checked,
            document.getElementById('multiple-percentage').checked
        );
        updateChart();
    });
});

document.getElementById('bottom-sheet').addEventListener('submit', function(event) {
    event.preventDefault();
    M.Modal.getInstance(document.getElementById('bottom-sheet')).close();
});

document.getElementById('show-map').addEventListener('change', function(event) {
    event.preventDefault();
    if (event.target.checked) {
        document.getElementById('x-select').disabled = true;
        document.getElementById('y-select').disabled = true;
        document.getElementById('x-quantile').disabled = true;
        document.getElementById('x-interval').disabled = true;
        document.getElementById('x-rank').disabled = true;
        document.getElementById('multiple-select').disabled = true;
        settings.showMap = true;
    } else {
        document.getElementById('x-select').disabled = false;
        document.getElementById('y-select').disabled = false;
        document.getElementById('multiple-select').disabled = false;
        handleXVariableChange(
            document.getElementById('x-select').value,
            document.getElementById('x-quantile').checked,
            document.getElementById('x-interval').checked,
            document.getElementById('x-rank').checked
        );
        settings.showMap = false;
    }
    updateChart();
});

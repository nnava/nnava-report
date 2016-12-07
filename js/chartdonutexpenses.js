define(['./alasql.min', './alasqlavanza', './alasqlnordnet', './monthstaticvalues'], function(alasqlhelper, alasqlavanza, alasqlnordnet, monthstaticvalues) {

    var chartData;
    var chartId;
    var monthsInput = monthstaticvalues.getMonthInputs();

    function setChartId(fieldId) {
        chartId = fieldId;
    }

    function setChartData(avanzaValue, nordnetValue) {

        alasqlnordnet.setSourceData(nordnetValue);
        alasqlavanza.setSourceData(avanzaValue);

        var nordnetYearData = alasqlnordnet.getDividendMaxYear();
        var avanzaYearData = alasqlavanza.getDividendMaxYear();

        alasql('CREATE TABLE IF NOT EXISTS ArTable \
                (Ar INT);');

        alasql('INSERT INTO ArTable SELECT Ar \
                FROM ?', [nordnetYearData]);

        alasql('INSERT INTO ArTable SELECT Ar \
                FROM ?', [avanzaYearData]);

        var resultYear = alasql('SELECT DISTINCT Ar FROM ArTable');
        alasql('TRUNCATE TABLE ArTable');

        var monthNumber = 11;
        var totalYearExpenses = 0;
        var totalYearDividends = 0;

        var year = resultYear["0"].Ar;
        for(var i=0; i <= monthNumber; i++)
        {
            var month = i + 1;

            var resultNordnet = alasqlnordnet.getDividendSumBelopp(year, month);
            var resultAvanza = alasqlavanza.getDividendSumBelopp(year, month);

            var beloppNordnet = JSON.parse(JSON.stringify(resultNordnet));
            var beloppAvanza = JSON.parse(JSON.stringify(resultAvanza));

            var totalBelopp = parseInt(beloppNordnet["0"].Belopp) + parseInt(beloppAvanza["0"].Belopp);
            totalYearDividends = totalYearDividends + totalBelopp;

            var monthValue = $('#' + monthsInput[i]).data("kendoNumericTextBox").value();
            totalYearExpenses = totalYearExpenses + monthValue;
        }

        var donutData = [];
        donutData.push({
            category: "Utdelningar",
            value: totalYearDividends,
        });

        donutData.push({
            category: "Kostnader",
            value: totalYearExpenses,
        });

        chartData = donutData;
    }

    function loadChart() {
        $(chartId).kendoChart({
            title: {
                text: "Utdelningar/utgifter total"
            },
            legend: {
                position: "top"
            },
            seriesDefaults: {
                labels: {
                    template: "#= category # - #= kendo.format('{0:P}', percentage)#",
                    position: "outsideEnd",
                    visible: true,
                    background: "transparent"
                }
            },
            series: [{
                type: "donut",
                data: chartData
            }],
            tooltip: {
                visible: true,
                template: "#= category # - #= kendo.format('{0:P}', percentage) #"
            },
            theme: "bootstrap"
        });
    }

    return {
        setChartId: setChartId,
        setChartData: setChartData,
        loadChart: loadChart
    };
});
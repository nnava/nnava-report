define(['./papaparse.min', './appcontrolloader', './alasqlavanza', './alasqlnordnet'], function(Papa, appControlLoader, alasqlavanza, alasqlnordnet) {
  
    var controlId;

    function setControlId(fieldId) {
        controlId = fieldId;
    }

    function load() {
        $(controlId).kendoUpload({
            async: {         
                autoUpload: true
            },
            select: onSelect,
            remove: onRemove,
            validation: {
                allowedExtensions: [".csv"]
            },
            showFileList: true,
            multiple: true,
            localization: {
                select: 'Välj fil(er)',
                remove: 'Ta bort',
                cancel: 'Avbryt'
            }
        });
    }

    function onRemove(e) {

        $.each(e.files, function (index, value) {
            var reader = new FileReader();

            reader.onload = function(e) {
                var isFileAvanza = reader.result.startsWith("Datum");

                if(isFileAvanza)
                    alasql('TRUNCATE TABLE AvanzaData');
                else
                    alasql('TRUNCATE TABLE NordnetData');

                appControlLoader.loadControls();
            }

            reader.readAsText(value.rawFile);
        });
    }

    var ALLOWED_EXTENSIONS = [".csv"];
    var maxFiles = 10;

    function onSelect(e) {

        if($('#dataFiles').parent().children('input[type=file]:not(#uploader)').length > maxFiles) {
            e.preventDefault();
            alert("Max antal filer är tio");
        }      

        kendo.ui.progress($(document.body), true);
     
        var fileArrayLength = e.files.length;
        var timeoutValue = 1;

        alasqlavanza.createDataTable();
        alasqlnordnet.createDataTable();

        $.each(e.files, function (index, value) {

            var extension = value.extension.toLowerCase();
            if (ALLOWED_EXTENSIONS.indexOf(extension) == -1) {
                alert("Endast fil med filformat CSV");
                e.preventDefault();
            }
            
            var reader = new FileReader();
            reader.onloadend = function(e) {
                if((index +1) == fileArrayLength) {        
                    appControlLoader.loadControls();                    
                }
            }
 
            reader.onload = function(e) {
                var readerResultString = reader.result;
                var isFileAvanza = readerResultString.startsWith("Datum");
                var hasNordnetDataValue = false;
                if($('#nordnetData').val() && isFileAvanza == false)
                    hasNordnetDataValue = true;

                // If we already have a file of NN, remove first line for this
                if(hasNordnetDataValue) {
                    readerResultString = readerResultString.substring(readerResultString.indexOf("\n") + 1);
                }

                readerResultString = replaceToNeededCharacters(readerResultString);

                if(isFileAvanza) {
                    alasql('INSERT INTO AvanzaData SELECT * FROM CSV(?, {separator:";"})', [readerResultString]);
                }                    
                else {
                    var nordnetData = JSON.parse(getBankSourceJsonData(readerResultString));
                    alasql('INSERT INTO NordnetData \
                    SELECT [Affärsdag], Antal, Avgifter, Belopp, [Bokföringsdag], ISIN, Instrumenttyp, Kurs, Likviddag, Makuleringsdatum, Transaktionstyp, Valuta, [Värdepapper] FROM ?', [nordnetData]);
                }
            }
            
            setTimeout(function(){ reader.readAsText(value.rawFile, 'ISO-8859-1'); }, timeoutValue);
            timeoutValue += 50;
        }); 
    };

    function replaceAll(str, find, replace) {
        return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
    }

    function escapeRegExp(str) {
        return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }

    function replaceToNeededCharacters(stringValue) {

        stringValue = replaceAll(stringValue, "/", "");
        stringValue = replaceAll(stringValue, ",", ".");

        return stringValue;
    }

    function getBankSourceJsonData(stringValue) {

        var config = {
            header: true,
            skipEmtyLines: true
        };

        var parsedResult = Papa.parse(stringValue, config);
        return JSON.stringify(parsedResult.data);
    }

    return {
        setControlId: setControlId,
        load: load
    }

});
//  ------------------------------------------------------------------------------------- //
var content;
var applicationid;
var applicationfolder;
var vsiteurl;
var vNamespace;

//push config to content
$.ajax({
    url: "./json/qdc_config.json", type: "GET", dataType: "json",
    success: function (data) {
        ;
        content = data;
        applicationid = content.config.cloudera.appid;
        applicationfolder = content.config.general.folder;
        vsiteurl = content.config.general.connect;
        vNamespace = content.config.cloudera.namespace;
    }, error: function (jqXHR, textStatus, errorThrown) {
        console.log(textStatus, errorThrown);
    }
}).then(function () {
    //  ------------------------------------------------------------------------------------- //

    var rootPath = window.location.hostname;
    var portUrl = "81";

    if (window.location.port == "") {
        if ("https:" == window.location.protocol)
            portUrl = "443";
        else {
            portUrl = "81";
        }
    }
    else
        portUrl = window.location.port;

    var pathRoot = "//localhost:4848/extensions/";
    if (portUrl != "4848")
        pathRoot = "//" + rootPath + ":" + portUrl + "/resources/";

    var config = {
        host: window.location.hostname,
        prefix: "/ticket/",
        port: window.location.port,
        isSecure: window.location.protocol === "https:"
    };

    require.config({
        baseUrl: (config.isSecure ? "https://" : "http://") + config.host + (config.port ? ":" + config.port : "") + config.prefix + "resources",
        paths: { app: (config.isSecure ? "https://" : "http://") + config.host + (config.port ? ":" + config.port : "") }
    });

    require([
        "js/qlik",
        "jquery",
        applicationfolder + "/js/bootstrap.min",
        applicationfolder + "/js/bootstrap-select",
        applicationfolder + "/js/bootstrap-notify.min",
        applicationfolder + "/js/jquery.cookie",
        applicationfolder + "/js/bootstrap-switch.min",
        applicationfolder + "/js/tree-beta",
        applicationfolder + "/js/filters",
        applicationfolder + "/js/selections",
        applicationfolder + "/js/script"
    ],
        function (qlik, $, a, selectpicker, b, c, d, e, filters, selections, script) {
            //Variables
            var vDataConnection = '';                       //Contains Data Connection string
            var dataConnectionTransfer = '';              //Contains Name of Data Connection
            var finalScript = '';                          //Contains final script to push into app
            var reloaded = null;                            //Reloadstatus
            var gettypeobject = '';                         //Holds GenericObject for Type
            var directDiscoveryCheck = 'off';                           //Direct Discovery Check
            var vLimit = 0;                                 //Containts Value for Limit
            var thousandSeperator = ','                    //Sign to format thounsands

            var newFilterRowNum = 2; // first value is hard coded for now
            var vSessionObject;     //holding SessionObject
            var newFilterRow = '';
            var filterPresent = 0;   // flag for if filter present

            // IDs
            var databaseFilterId = 'mSxnNj'
            var tableFilterId = 'aExEHJ'
            var columnFilterId = 'UyxsShT'
            var tagFilterId = 'EaevuCA'

            // record user selections
            var currentDbs = []
            var currentTables = []
            var currentCols = []
            var selectionObjs = []
            // Current selections
            var summaryTableCols = []
            var detailTableCols = []
            var selectedTable = []
            // Filter Variables

            var sourceFieldOptions = "";      //containing database and table options for the filter dropdown
            var colFieldOptions = "";        // containing column options for the filter dropdown
            // APP UI functions

            var addTableButtonClicked = false;

            function AppUi(app) {
                var me = this;
                this.app = app;
                app.global.isPersonalMode(function (reply) {
                    me.isPersonalMode = reply.qReturn;
                });
                // Update Bookmark List
                app.getList("BookmarkList", function (reply) {
                    var str = "";
                    reply.qBookmarkList.qItems.forEach(function (value) {
                        if (value.qData.title) {
                            str += '<li><a class="linkstyle bookmark-item" href="#" data-id="' + value.qInfo.qId + '">' + value.qData.title + '</a></li>';
                        }
                    });
                    str += '<li role="separator" class="divider"></li><li><a href="#" data-cmd="create"><b>Create Bookmark</b></a></li>';
                    $('#qbmlist').html(str).find('a').on('click', function () {
                        var id = $(this).data('id');
                        if (id) {
                            app.bookmark.apply(id);
                        } else {
                            var cmd = $(this).data('cmd');
                            if (cmd === "create") {
                                $('#createBmModal').modal();
                            }
                        }
                    });
                });
            }

            $("[data-qcmd]").on('click', function () {
                // Create Bookmark
                var $element = $(this);
                switch ($element.data('qcmd')) {
                    //app level commands
                    case 'createBm':
                        var title = $("#bmtitle").val(), desc = $("#bmdesc").val();
                        app.bookmark.create(title, desc);
                        $('#createBmModal').modal('hide');
                        break;
                }
            });

            // Update Bookmark selection
            $("body").on("click", ".bookmark-item", function () {
                var element = $(this)
                $('#bookmark-btn').html($(this).text() + ' <span class="caret"></span>')
                console.log(element)
            })

            //Bootstrap Switch
            $('input[name="DDCheck"]').bootstrapSwitch();

            //App Object Connection
            var app = qlik.openApp(applicationid, config);
            app.clearAll();

            //get objects -- inserted here --
            app.getObject('CurrentSelections', 'CurrentSelections');
            // first three are database, table and column filter panes
            app.getObject('QV01', databaseFilterId);
            app.getObject('QV02', tableFilterId);
            app.getObject('QV03', columnFilterId);
            app.getObject('QV04', 'PbWqLs');
            app.getObject('QV05', 'bdjLf');
            app.getObject('QV06', 'ybWmTHe');
            app.getObject('QV07', 'qBZDR');
            app.variable.setStringValue('vLimit', '0');

            //UI Functions for progress
            $("#seldatacon").on('click', function () {
                $('#myTab a[href="#Datacon"]').tab('show');
                $('.progress-bar').css('width', '0%');
            });

            $("#seltable").on('click', function () {
                $('#myTab a[href="#Table"]').tab('show');
                $('.progress-bar').css('width', '35%');
            });

            $("#reloaddata").on('click', function () {
                $('#myTab a[href="#Reload"]').tab('show');
                $('.progress-bar').css('width', '100%');
            });

            //Get DataConnections @ start
            $(document).ready(function () {
                var vConnection = [];
                var scope = $('body').scope();
                scope.enigma = null;
                console.log("app.global.session", app.global.session);

                scope.$watch(function () { return app.global.session.__enigmaApp }, function (newValue, oldValue) {
                    if (newValue) {
                        scope.enigma = newValue;
                        console.log("bound Enigma", scope.enigma);

                        scope.enigma.getConnections().then(function (connection) {
                            $.each(connection, function () {
                                vConnection.push(this.qName);
                                $('#dataconnection').append('<option class="data-connection-entry">' + this.qName + '</option>');
                            });
                            $('.selectpickerdatacon').selectpicker({
                                style: 'btn-primary',
                                size: 10,
                            });
                            // scope.enigma.session.close();
                        });
                    }
                });
            });

            // ********** Start of handlers for section 1 (Data Connection) **********

            $('#PickDataCon').on('click', function () {
                $('#myTab a[href="#Table"]').tab('show');
                $('.progress-bar').css('width', '35%');
                var vTimeout5 = setTimeout(myTimer5, 100);
                function myTimer5() {
                    qlik.resize();
                };
            });

            //Pick Data Connection
            $('#dataconnection').on('changed.bs.select', function (e) {
                console.log($('#dataconnection').val());
                dataConnectionTransfer = $('#dataconnection').val();

                vDataConnection = "LIB CONNECT TO '" + dataConnectionTransfer + "';";
            });

            //Activate Button "Apply Data Connection"
            $('#dataconnection').on('changed.bs.select', function () {
                $('#PickDataCon').removeClass('disabled');
                //$('#PickDataCon').addClass('active');
                $('#PickDataCon').prop('disabled', false);
            });

            // ********** Start of handlers for section 2 (Table) **********

            // Direct Discovery Handlers
            //DDCheck Switch
            $('input[name="DDCheck"]').on('switchChange.bootstrapSwitch', function (event, state) {
                if (state == true) {
                    directDiscoveryCheck = 'on';
                    $('#Limit').hide();
                    console.log('switched to on');
                } else {
                    directDiscoveryCheck = 'off';
                    $('#Limit').show();
                    console.log('switched to off');
                }
            });

            // Filter Handlers
            //show hide Filterbody
            $('#createFilterSection').on('click', function () {
                // at least one table is present
                if (selectionObjs.length != 0) {
                    if ($('#Filterbody').css('display') === 'none') {
                        // Filter structure created on add table button press as it gets up
                        filterPresent = 1;
                        colFieldOptions = filters.initialColOptions(selectionObjs)                        
                        //filters.updateFilterSourceOptions(selectionObjs, sourceFieldOptions);
                        //$('.selectpicker').selectpicker();
                        $('#Filterbody').show();
                    }
                }
                else {
                    // TODO: Add warning to ask the user to enter a database, table and columns
                    console.log('Add warning to ask the user to enter a database, table and columns')
                }
            });

            $('#closeFilterbody').on('click', function () {
                $('#Filterbody').hide();
                //$(".filter-source-fields").html("");
                //$(".filter-col-fields").html("");
                $("#filter-row-1").siblings().remove();
                newFilterRow = '';
                sourceFieldOptions = '';
                colFieldOptions = '';

            });

            //Add another Filteroption

            $("body").on('click', '#addFilter', function () {
                newFilterRow = filters.addFilterRow(newFilterRowNum, sourceFieldOptions, colFieldOptions)
                var lastAddedFilter = $('#filterTable tr:last')
                if(newFilterRowNum > 1){
                    $(newFilterRow).insertAfter($('#filterTable tr:last'));
                }
                else{
                    $("#filterTable tbody").append(newFilterRow);
                }
                $('.selectpicker').selectpicker();
                newFilterRowNum++;
                console.log($('#Filterbody tr').length);
                //update operators in other filter rows
                filters.updateAllOperators()
            });

            $("body").on("click", ".remove-filter", function () {
                // Get the row to remove
                console.log($(this))
                let rowIndexID = $(this).attr('id');
                // Strip the row number from the id
                let rowIndex = rowIndexID.slice(rowIndexID.length - 1);
                // Remove element from DOM
                $("#filter-row-" + rowIndex).remove()
                newFilterRowNum--;

            });

            //Remove a Filter option
            $("body").on('click', '.Filter_add_right', function () {
                $('#' + $(this).closest("tr").attr('id')).remove();
                //Count # rows
                console.log($('#Filterbody tr').length);
            });

            $("#show-tags").on('click', function(){
                
                //$(".selection-box").each(function(){
                    $("#tags").toggle();
                        // Hide Tags
                        //$(this).removeClass("col-xs-3")
                        //$(this).addClass("col-xs-4")
                        //$("#tag-section").hide()
                    //$("#show-tags").text("Show Tags")
                    //}
                    //else{
                        // Show Tags
                        //$(this).removeClass("col-xs-4")                        
                        //$(this).addClass("col-xs-3")
                        //$("#tag-section").show()
                        //$("#show-tags").text("Hide Tags")
                        app.getObject('QV08', tagFilterId);                        
                    //}
                //})
            });

            // Limit Handlers
            $('#Limit').on('click', function () {
                // show modal to set limit value
                $('#modalLimit').modal();
            });

            $('#applyLimit').on('click', function () {
                vLimit = ($('#valueLimit').val());
                app.variable.setStringValue('vLimit', $('#valueLimit').val());
                $('#modalLimit').modal('toggle');
                $('#Limit').removeClass('btn-default');
                $('#Limit').addClass('btn-success');
                $('#RowAmount').empty();
                $('#RowAmount').append(formatNumber(vLimit));
            });

            //Table and Column details for showing number of rows and distinct values
            $('#details1, #details2').on('click', function () {
                $('#modalDetails').modal();
                qlik.resize();
            })

            //Amount Information for Selection
            app.createGenericObject({
                DBAmount: {
                    qStringExpression: "=$(vDBAmount)"
                },
                TableAmount: {
                    qStringExpression: "=$(vTBAmount)"
                },
                ColAmount: {
                    qStringExpression: "=$(vColAmount)"
                },
                RowAmount: {
                    qStringExpression: "=$(vRowAmount)"
                }
            }, function (data) {
                $('#DBAmount').empty();
                $('#DBAmount').append(formatNumber(data.DBAmount));
                $('#TableAmount').empty();
                $('#TableAmount').append(formatNumber(data.TableAmount));
                $('#ColAmount').empty();
                $('#ColAmount').append(formatNumber(data.ColAmount));
                if (vLimit != 0) {
                    $('#RowAmount').append(formatNumber(vLimit));
                } else {
                    //if (data.RowAmount === '0') {
                        //$('#RowAmount').text("Number of Rows: ");
                    //} else {
                        $('#RowAmount').text("Number of Rows: " + formatNumber(data.RowAmount));
                    //}
                }
            });

            //Selection Logic

            // if qlik selection popover is clicked on
            $("body").on("click", ".lui-popover-container", function () {
                //console.log(this.parent());
                app.getList('SelectionObject', function (selectionObj) {
                    console.log('should now have selection obj')
                    var currentSelections = selections.updateCurrentSelections(selectionObj, currentDbs, currentTables, currentCols)
                    currentDbs = currentSelections[0]
                    currentTables = currentSelections[1]
                    currentCols = currentSelections[2]
                });
            })

            $("body").on("click", ".filter-source-fields", function () {   
                // populate the filter dropdown with the columns for the source the user selected
                colFieldOptions = filters.updateFilterColOptions(selectionObjs, $(this))
                // only show operator if it is not the first occurance of the filter
                filters.updateAllOperators()
            });

            // Select all possible matches
            $('#add-all-possible-btn').on('click', function () {
                //filterPane = app.getObject('QV03', 'UyxsShT');    
                app.field('Column').selectPossible();
            });

            // Remove DB selections
            $('#remove-selections-dbs').on('click', function () {
                app.field('db_name').clear();
            });

            // Remove table selections
            $('#remove-selections-tables').on('click', function () {
                app.field('table_name').clear();
            });

            // Remove column selections
            $('#remove-selections-cols').on('click', function () {
                app.field('Column').clear();
            });

            // Remove column selections
            $('#remove-selections-tags').on('click', function () {
                app.field('metadata_tag').clear();
            });


            $('body').on('click', ".remove-row", function () {
                let parentId = $(this).parent().get(0).id
                rowId = parseInt(parentId.substr(parentId.length - 1));            
                selections.removeSelectionRow(rowId, selectionObjs)
                script.removeScriptEntry(rowId)
            })

            // Create Objects to store scripts
            $('#AddScriptEntry').on('click', function () {
                console.log('Adding script entry...')
                console.log(directDiscoveryCheck);
                addTableButtonClicked = true;
                //Check DDListbox
                
                // May say 20 of 2048 etc. 
                // Need to get actual names if this happens
                //currentCols = selections.checkColumnNamesExist(currentCols, app)
                app.createGenericObject({
                    colsConcat: {
                        qStringExpression: "=$(vColConcat)"
                    }
                }, function(colsConcatObj){
                    if(addTableButtonClicked){
                        if(currentCols.length == 1 && currentCols[0].includes("of")){                        
                            var colsArray = colsConcatObj.colsConcat.split("|")
                            //var currentSelections = selections.updateCurrentSelections(selectionObj, currentDbs, currentTables, currentCols)
                            currentCols = colsArray.slice(0, colsArray.length - 1)
                        }

                        // Don't add unless selection is correctly defined
                        if (currentDbs.length != 0 && currentTables != 0 && currentCols != 0) {
                            // Store selections for later
                            selectionObjs.push({
                                currentDbs: currentDbs,
                                currentTables: currentTables,
                                currentCols: currentCols
                            })

                            // Add the latest selecctions to the dom
                            selections.recreateSelectionRows(selectionObjs)

                            // Update Filter Selction Options to Inlcude new selections
                            sourceFieldOptions = filters.updateFilterSourceOptions(selectionObjs, sourceFieldOptions)

                            currentDbs = []
                            currentTables = []
                            currentCols = []
                            app.clearAll();
                        
                        }
                        // Either the database, table or column selection is empty
                        else {
                            // TODO: Need to add warning that selection must be made
                            console.log("Need to add warning that selection must be made")
                        }
                    }
                    addTableButtonClicked = false
                });
            });

            // Start of handlers for section 3 (Script)

            $('#CreateScript').on('click', function () {
                $('#myTab a[href="#Script"]').tab('show');
                $('.progress-bar').css('width', '65%');
                var filterObjs = filters.extractFiltersFromHTML()
                script.createScript(selectionObjs, filterObjs, app, directDiscoveryCheck, filterPresent, vLimit);
            });


            // Allow user to add additional tables
            $('.changeSelections').on('click', function () {

                // Remove the script so that it can be appended next time
                $('#Scripttable').empty()

                // directDiscoveryCheck = 'off';
                // filterPresent = 0;

                // Hide Filters
                // $('#Filterbody').hide();
                // $(".filter-source-fields").html("");
                // $(".filter-col-fields").html("");
                // $("#filter-row-1").siblings().remove();
                //newFilterRow = '';
                // sourceFieldOptions = '';
                // colFieldOptions = '';

                // Reset direct discovery
                // $('input[name="DDCheck"]').bootstrapSwitch('state', false);
                // app.clearAll();
                // app.variable.setStringValue('vLimit', '0');

                // Move progress back a step
                $('#myTab a[href="#Table"]').tab('show');
                $('.progress-bar').css('width', '35%');
                var vTimeout5 = setTimeout(myTimer5, 100);
                function myTimer5() {
                    qlik.resize();
                };

                // Reset limit
                // $('#Limit').show();
                // $('#Limit').removeClass('btn-success');
                // $('#Limit').addClass('btn-default');
            });

            //Apply selected Tables
            $('#applyseltables').on('click', function () {

                // Empty summary table
                $('#infodatacon').empty();
                $('#infodatasource').empty();
                $('#infotables').empty();
                $('#infoc').empty();
                summaryTableCols = [];

                // Increase progress bar
                $('#myTab a[href="#Reload"]').tab('show');
                $('.progress-bar').css('width', '100%');

                // Hide KPIs
                $('#KPI1').hide()
                $('#KPI2').hide()
                $('#KPI3').hide()
                $('#KPI4').hide()
                
                finalScript = script.createFinalScript(finalScript, vDataConnection)
                //Display Overview

                // Loop through selections backwards to populate tree
                var columnListString = "";
                
                var treeObj = script.generateTreeObj()
                var vSelectedTableProp = treeObj[0]
                var columnsArray = treeObj[1]
                var avmes = treeObj[2]
                var avdim = treeObj[3]

                for (var i = vSelectedTableProp.length - 1; i >= 0; i--) {
                    // ConumberStringuct html list of columns
                    $.each(columnsArray, function (index, value) {
                        columnListString += `<li class="tree-leaf">${value}</li>`;
                    });
                    console.log('columnListString: ' + columnListString)

                    //Append content to table
                    $('#tree-root').after(`
                        <ul class="nav nav-list tree bullets">
                            <li>
                                <label id="infodatasource-${i}" class="tree-toggle nav-header infodatasource">
                                    ${vSelectedTableProp[i][1].SCHEMA}
                                </label>
                                <ul class="nav nav-list tree">
                                    <li>
                                        <label id="infotable-${i}" class="nav-header infotable tree-table">
                                            ${vSelectedTableProp[i][1].TABLE}
                                        </label>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    `)

                    // Old version with columns
                //     $('#tree-root').after(`
                //     <ul class="nav nav-list tree bullets">
                //         <li>
                //             <label id="infodatasource-${i}" class="tree-toggle nav-header infodatasource">
                //                 ${vSelectedTableProp[i][1].SCHEMA}
                //             </label>
                //             <ul class="nav nav-list tree">
                //                 <li>
                //                     <label id="infotable-${i}" class="nav-header infotable tree-table">
                //                         ${vSelectedTableProp[i][1].TABLE}
                //                     </label>
                //                     <ul class="nav nav-list tree column-list">
                //                         ${columnListString}
                //                     </ul>
                //                 </li>
                //             </ul>
                //         </li>
                //     </ul>
                // `)
                }


                $('#infodatacon').append(dataConnectionTransfer);

                $("body").on("click", ".tree-toggle", function () {
                    console.log('Toggling Tree...')
                    $(this).parent().children('ul.tree').toggle(200);
                });

                // $('.tree-leaf').on('click', function (element) {
                //     if ($(this).hasClass('active-tree-leaf')) {
                //         // item already selected so unselect and remove
                //         $(this).removeClass('active-tree-leaf')
                //         let index = summaryTableCols.indexOf($(this).text())
                //         summaryTableCols.splice(index, 1)
                //     }
                //     else {
                //         // item is not selected so select and add
                //         $(this).addClass('active-tree-leaf')
                //         //summaryTableCols.push($(this).text())
                //     }
                //     app.clearAll().then(function(){
                //         app.field('table_name').selectValues(["accounttype"]).then(function(){
                //             app.visualization.create('table', summaryTableCols).then(function (chart) {
                //                 // parameter is the id of html element to show in
                //                 chart.show('QVINFO');
                //                 qlik.resize();
                //             });
                //         })
                //     });
                // });

                summaryTableCols.push('table_name')
                summaryTableCols.push('#Rows')
                summaryTableCols.push('Size')
                summaryTableCols.push('Format')
                summaryTableCols.push('#Files')

                detailTableCols.push('Column')
                detailTableCols.push('Type')
                detailTableCols.push('#Nulls')
                detailTableCols.push('#Distinct Values')
                detailTableCols.push('Max Size')
                detailTableCols.push('Avg Size')

                tableList = []
                for(selectionIndex in selectionObjs){
                    tableList = tableList.concat(selectionObjs[selectionIndex].currentTables)
                }

                app.clearAll().then(function(){
                    app.field('table_name').selectValues(tableList).then(function(){
                        app.visualization.create('table', summaryTableCols).then(function (chart) {
                            // parameter is the id of html element to show in
                            chart.show('QVINFO');
                            qlik.resize();
                        });  
                    });
                });

                $('.tree-table').on('click', function (element) {
                    // uncheck sibling elements that are selected
                    $(".tree-table").not(this).each(function(){
                        if ($(this).hasClass('active-tree-table')) {
                            // item already selected so unselect and remove
                            $(this).removeClass('active-tree-table')
                        }
                    })

                    if ($(this).hasClass('active-tree-table')) {
                        // item already selected so unselect and remove
                        $(this).removeClass('active-tree-table')

                        $('#KPI1').hide()    
                        $('#KPI2').hide()                                    
                        $('#KPI3').hide()                                    
                        $('#KPI4').hide()  

                        $("#summary-title").text("Table Summary")

                        //show summary table again
                        app.clearAll().then(function(){
                            app.field('table_name').selectValues(tableList).then(function(){
                                app.visualization.create('table', summaryTableCols).then(function (chart) {
                                    // parameter is the id of html element to show in
                                    chart.show('QVINFO');
                                    qlik.resize();
                                });
                            });
                        });
                    }
                    else {
                        selectedTable = []
                        // item is not selected so select and add
                        $(this).addClass('active-tree-table')
                        selectedTable.push($(this).text().trim())  
                        
                        $("#summary-title").text("Table Details")

                        // generate detailed table
                        app.clearAll().then(function(){
                            app.field('table_name').selectValues(selectedTable).then(function(){
                                app.visualization.create('table', detailTableCols).then(function (chart) {
                                    // parameter is the id of html element to show in
                                    chart.show('QVINFO');                                  
                                    qlik.resize();
                                }); 
                                var rowsKpiObj = [{"qDef" : { "qDef" : "=Only([#Rows])", "qLabel" : "Number of Rows"}}]
                                var sizeKpiObj = [{"qDef" : { "qDef" : "=Only([Size])", "qLabel" : "Size"}}]
                                var formatKpiObj = [{"qDef" : { "qDef" : "=Only([Format ])", "qLabel" : "Format"}}]
                                var filesKpiObj = [{"qDef" : { "qDef" : "=Only([#Files])", "qLabel" : "Number of Files"}}]
                                
                                app.visualization.create('kpi', rowsKpiObj, {fontSize:"S"}).then(function (chart) {
                                    // parameter is the id of html element to show in
                                    chart.show('KPI1');
                                    $('#KPI1').show()
                                    qlik.resize();
                                }); 
                                app.visualization.create('kpi', sizeKpiObj, {"fontSize":"S"}).then(function (chart) {
                                    // parameter is the id of html element to show in
                                    chart.show('KPI2');
                                    $('#KPI2').show()
                                    qlik.resize();
                                });  
                                app.visualization.create('kpi', formatKpiObj, {"fontSize":"S"}).then(function (chart) {
                                    // parameter is the id of html element to show in
                                    chart.show('KPI3');
                                    $('#KPI3').show()
                                    qlik.resize();
                                });  
                                app.visualization.create('kpi', filesKpiObj, {"fontSize":"S"}).then(function (chart) {
                                    // parameter is the id of html element to show in
                                    chart.show('KPI4');
                                    $('#KPI4').show()
                                    qlik.resize();
                                });  
                            });
                        });
                    }
                });

            

                // app.visualization.create('barchart',
                //     [
                //         {
                //             qDef: {
                //                 qFieldDefs: ["=ValueList('Data-Sources','Tables','Columns','Dimensions','Measures')"],
                //                 "qFieldLabels": ["Selection"],
                //                 "qSortCriterias": [
                //                     { "qSortByLoadOrder": 1 }
                //                 ]
                //             },
                //         },
                //         {
                //             qDef: {
                //                 qDef: "=pick(rowno()," + a + "," + b + "," + c + "," + e + "," + f + ")",
                //                 qLabel: "Amount"
                //             }
                //         }
                //     ],
                //     {
                //         "showTitles": false,
                //         "dimensionAxis": {
                //             "show": "labels",
                //             "dock": "far"
                //         },
                //         "measureAxis": {
                //             "show": "labels"
                //         },
                //         "orientation": "horizontal",
                //         "dataPoint": { "showLabels": true },
                //         "color": {
                //             "auto": false,
                //             "mode": "byExpression"
                //         }
                //     }

            });

            //Create App
            $('#createapp').on('click', function () {
                var vApp = "";
                var vAppID = "";
                var vTimestamp = timeStamp();
                var notify = "";
                var new_app = null;

                var global = qlik.getGlobal(config);
                var scope = $('body').scope();
                scope.enigma = null;
                console.log("global.session", global.session);
                //console.log('global',global);

                scope.$watch(function () { return global.session.__enigmaApp }, function (newValue, oldValue) {

                    if (newValue) {
                        $.notify({ icon: 'glyphicon glyphicon-ok', message: 'Connection to Qlik Sense Server establised.' }, { type: 'success', placement: { from: 'bottom', align: 'right' } });
                        scope.enigma = newValue;
                        console.log("bound Enigma", scope.enigma);
                        vApp = vNamespace + '_' + vTimestamp;
                        scope.enigma.createApp(vNamespace + '_' + vTimestamp).then(function (newApp) {
                            $.notify({ icon: 'glyphicon glyphicon-ok', message: 'APP: <b>' + vApp + '</b> created successfully. ID: ' + '<b>' + newApp.qAppId + '</b>' }, { type: 'success', placement: { from: 'bottom', align: 'right' } }, { newest_on_top: true });
                            vAppID = newApp.qAppId;
                            //console.log('newApp.qAppId',newApp.qAppId);
                            console.log('newApp', newApp);
                            scope.enigma.openDoc(vAppID).then(function (conns) {
                                console.log('conns', conns);
                                new_app = conns;
                                var localsettings = "";
                                localsettings += "///$tab Main\r\n";
                                localsettings += "SET ThousandSep=',';\n";
                                localsettings += "SET DecimalSep='.';\n";
                                localsettings += "SET MoneyThousandSep=',';\n";
                                localsettings += "SET MoneyDecimalSep='.';\n";
                                localsettings += "SET MoneyFormat='#.##0,00 €;-#.##0,00 €';\n";
                                localsettings += "SET TimeFormat='hh:mm:ss';\n";
                                localsettings += "SET DateFormat='DD.MM.YYYY';\n";
                                localsettings += "SET TimestampFormat='DD.MM.YYYY hh:mm:ss[.fff]';\n";
                                localsettings += "SET MonthNames='Jan;Feb;Mrz;Apr;Mai;Jun;Jul;Aug;Sep;Okt;Nov;Dez';\n";
                                localsettings += "SET DayNames='Mo;Di;Mi;Do;Fr;Sa;So';\n";
                                localsettings += "SET LongMonthNames='Januar;Februar;März;April;Mai;Juni;Juli;August;September;Oktober;November;Dezember';\n";
                                localsettings += "SET LongDayNames='Montag;Dienstag;Mittwoch;Donnerstag;Freitag;Samstag;Sonntag';\n";
                                localsettings += "SET FirstWeekDay=0;\n";
                                localsettings += "SET BrokenWeeks=0;\n";
                                localsettings += "SET ReferenceDay=4;\n";
                                localsettings += "SET FirstMonthOfYear=1;\n";
                                localsettings += "SET CollationLocale='de-DE';\n";
                                localsettings += '\n';

                                new_app.setScript(localsettings + finalScript)
                                $.notify({ icon: 'glyphicon glyphicon-ok', message: 'LoadScript appended successfully.' }, { type: 'success', placement: { from: 'bottom', align: 'right' } });
                                notify = $.notify({ icon: 'glyphicon glyphicon-refresh glyphicon-refresh-animate', message: 'Indexing application...<br><div id="progress"></div><div id="progressstatus"></div>' }, { type: 'info', timer: '1000000', placement: { from: 'bottom', align: 'right' } });
                                console.log('Reload:');
                                return new_app.doReload();
                            }).then(function () {
                                notify.close();
                                $.notify({ icon: 'glyphicon glyphicon-ok', message: 'Application created successfully.' }, { type: 'success', placement: { from: 'bottom', align: 'right' } })
                                notify = $.notify({ icon: 'glyphicon glyphicon-refresh glyphicon-refresh-animate', message: 'Saving application...' }, { type: 'info', timer: '1000000', placement: { from: 'bottom', align: 'right' } });
                                console.log('Save:');
                                return new_app.doSave();
                            }).then(function (b) {
                                //console.log('b',b);
                                notify.close();
                                $.notify({ icon: 'glyphicon glyphicon-ok', message: 'App saved successfully.' }, { type: 'success', placement: { from: 'bottom', align: 'right' } });
                                var vurl = vsiteurl + vAppID;
                                var vurldataprep = vsiteurl + vAppID + '/datamanager/datamanager';
                                $.notify({ icon: 'glyphicon glyphicon-log-in', message: 'Click to open App', url: vurl }, { type: 'info', timer: '100000000', placement: { from: 'bottom', align: 'right' } });
                                $.notify({ icon: 'glyphicon glyphicon-log-in', message: 'Click to open Data-Prep', url: vurldataprep }, { type: 'info', timer: '100000000', placement: { from: 'bottom', align: 'right' } });
                                //console.log('global',global);
                                //console.log('new_app',new_app);
                                app.close();
                                //return new_app.session.close();
                                scope.enigma.session.close()
                                //global.session.close();
                            }).catch(function (error) {
                                console.error('Error' + error);
                                clearInterval(progress);
                            });

                            reloaded = null;
                            var progress = setInterval(function () {
                                if (reloaded != true) {
                                    // get the progress of the qlik data reload and display
                                    scope.enigma.getProgress(5).then(function (msg) {
                                        if (msg.qPersistentProgress) {
                                            persistentProgress = msg.qPersistentProgress;
                                            var text = msg.qPersistentProgress;
                                            $('#progress').append('<p>' + text + '</p>');
                                        } else {
                                            if (msg.qTransientProgress) {
                                                var text2 = persistentProgress + ' <-- ' + msg.qTransientProgress;
                                                $('#progressstatus').empty();
                                                $('#progressstatus').append('<p>' + text2 + '</p>');
                                            }
                                        }
                                    })
                                } else {
                                    clearInterval(progress)
                                }
                            }, 500);

                        }).catch(function (error) {
                            console.error('Error' + error);
                            clearInterval(progress);
                        });
                    }
                });

            });

            //Building Timestamps (Used to uniquely name app on creation)
            function timeStamp() {
                // Create a date object with the current time
                var now = new Date();

                // Create an array with the current month, day and time
                var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];

                // Create an array with the current hour, minute and second
                var time = [now.getHours(), now.getMinutes(), now.getSeconds()];

                // Determine AM or PM suffix based on the hour
                var suffix = (time[0] < 12) ? "AM" : "PM";

                // Convert hour from military time
                //time[0] = (time[0] < 12) ? time[0] : time[0] - 12;

                // If hour is 0, set it to 12
                time[0] = time[0] || 12;

                // If seconds and minutes are less than 10, add a zero
                for (var i = 1; i < 3; i++) {
                    if (time[i] < 10) {
                        time[i] = "0" + time[i];
                    }
                }

                // Return the formatted string
                var tmp = date.join() + "_" + time.join();
                return tmp.replace(/,/g, "");
            }

            //Format Numbers
            function formatNumber(numberString) {
                var rgx = /(\d+)(\d{3})/;
                while (rgx.test(numberString)) {
                    // add thousand seperator after every group of three numbers
                    numberString = numberString.replace(rgx, '$1' + thousandSeperator + '$2');
                }
                return numberString;
            }

            //RERUN Button
            $("#rerun").on('click', function () {
                location.reload(true);
            });


            if (app) {
                new AppUi(app);
            }
        });
});

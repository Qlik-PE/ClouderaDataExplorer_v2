//  ------------------------------------------------------------------------------------- //
var content;
var applicationid;
var applicationfolder;
var vsiteurl;
var vNamespace;

//push config to content
$.ajax({
    url: "./json/qdc_config.json", type: "GET", dataType: "json",
    success: function (data) {;
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
        applicationfolder + "/js/bootstrap-switch.min"
    ],

    function (qlik, $, selectpicker) {
        //Varibales
        var vDataConnection = '';                       //Contains Data Connection string
        var vDataconnection_transfer = '';              //Contains Name of Data Connection
        var vScriptArray = [];                          //Contains Script
        var vSelectedTableProp = [];                    //Contains Table definition
        var vcycle = -1;                                //Count cycles 
        var vfinalscript = '';                          //Contains final script to push into app
        var reloaded = null;                            //Reloadstatus
        var gettypeobject = '';                         //Holds GenericObject for Type
        var vDDCheck = 'off';                           //Direct Discovery Check
        var vLimit = 0;                                 //Containts Value for Limit
        var vThousandSeperator = '.'                    //Sign to format thounsands

        var whileconfigrownum = 2;
        var vSessionObject;     //holding SessionObject
        var addhtmlfields;      //containing Selected Fields as HTML (selectpicker)
        var whileconfigrow = '';
        var vCheckFilter = 0;   //I/O for Where Statement

        // APP UI functions

        function AppUi(app) {
            var me = this;
            this.app = app;
            app.global.isPersonalMode(function (reply) {
                me.isPersonalMode = reply.qReturn;
            });
            app.getList("BookmarkList", function (reply) {
                var str = "";
                reply.qBookmarkList.qItems.forEach(function (value) {
                    if (value.qData.title) {
                        str += '<li><a class="linkstyle" href="#" data-id="' + value.qInfo.qId + '">' + value.qData.title + '</a></li>';
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



        //Bootstrap Switch
        $('input[name="DDCheck"]').bootstrapSwitch();

        //App Object Connection
        var app = qlik.openApp(applicationid, config);
        app.clearAll();     

        //get objects -- inserted here --
        app.getObject('CurrentSelections', 'CurrentSelections');
        app.getObject('QV01', 'mSxnNj');
        app.getObject('QV02', 'aExEHJ');
        app.getObject('QV03', 'UyxsShT');
        app.getObject('QV04', 'PbWqLs');
        app.getObject('QV05', 'bdjLf');
        app.getObject('QV06', 'ybWmTHe');
        app.getObject('QV07', 'qBZDR');
        app.variable.setStringValue('vLimit','0');

        //UI Functions
        $("#seldatacon").on('click', function () {
            $('#myTab a[href="#Datacon"]').tab('show');
            $('.progress-bar').css('width', '0%');
        });

        $("#seltable").on('click', function () {
            $('#myTab a[href="#Table"]').tab('show');
            $('.progress-bar').css('width', '35%');
        });

        $("#createscript").on('click', function () {
            $('#myTab a[href="#Script"]').tab('show');
            $('.progress-bar').css('width', '65%');
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

            scope.$watch(function() { return app.global.session.__enigmaApp }, function (newValue, oldValue) {
                if (newValue) {
                    scope.enigma = newValue;
                    console.log("bound Enigma", scope.enigma);
        
                    scope.enigma.getConnections().then(function (connection) {
                        $.each(connection, function () {
                            vConnection.push(this.qName);
                            $('#dataconnection').append('<option>' + this.qName + '</option>');
    
                        });
                        $('.selectpickerdatacon').selectpicker({
                            style: 'btn-default',
                            size: 10
                        });
                        // scope.enigma.session.close();
                    });
                }
            });
        });

        //Activate Button "Apply Data Connection"
        $('#dataconnection').on('changed.bs.select', function () {
            $('#PickDataCon').removeClass('disabled');
            $('#PickDataCon').addClass('active');
            $('#PickDataCon').prop('disabled', false);
        });

        //Apply Data Connection
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
            vDataconnection_transfer = $('#dataconnection').val();

            vDataConnection = "LIB CONNECT TO '" + vDataconnection_transfer + "';";
        });

        //DDCheck Switch
        $('input[name="DDCheck"]').on('switchChange.bootstrapSwitch', function (event, state) {
            if (state == true) {
                vDDCheck = 'on';
                $('#Limit').hide();
                console.log('switched to on');
            } else {
                vDDCheck = 'off';
                $('#Limit').show();
                console.log('switched to off');
            }
        });

        //Apply Selected Table
        $('#ApplySelectedTable').on('click', function () {
            console.log(vDDCheck);
            //Check DDListbox

            //WHERE CLAUSE

            var vWhere = 'WHERE ';

            $('#Filterbody tbody tr').each(function () {
                var vcurrentobject = this.id.slice(-1);
                var parameters = Array.from($(this).find(':nth-child(1)').find(':selected')).map(function (item) {
                    return $(item).text();
                });

                var value = $('input[id^="Filter_Value_'+ vcurrentobject +'"]').val();  
                    
                console.log(parameters);
                console.log(value);

                if (vcurrentobject == 1) {
                    vWhere += parameters[0] + " " + parameters[1] + " '" + value + "' ";
                    console.log(vWhere);
                } else {
                    vWhere += parameters[0] + " " + parameters[1] + " " + parameters[2] + " '" + value + "' ";
                    console.log(vWhere);
                };
            });



            app.createGenericObject({
                Load: {
                    qStringExpression: "=$(vLoadComplete)"
                },

                LoadDD: {
                    qStringExpression: "=$(vLoadDD)"
                },
                Schema: {
                    qStringExpression: "=concat(if(GetFieldSelections([db_name])<> null(),GetFieldSelections([db_name]),''),',')"
                },
                Table: {
                    qStringExpression: "=concat(if(GetFieldSelections([table_name])<> null(),GetFieldSelections([table_name]),''),',')"
                },
                Column: {
                    qStringExpression: "=concat( distinct [Column],', ')"
                },
                Measure: {
                    qStringExpression: "=concat(if(GetFieldSelections(MEASURE_NAME)<> null(),GetFieldSelections(MEASURE_NAME),''),',')"
                },
                Dimension: {
                    qStringExpression: "=concat(DIMENSION_NAME,', ')"
                }
            }, pushScript);

            function pushScript(reply) {
                if (vDDCheck == 'on') {
                    vScriptArray.push(reply.LoadDD);
                } else {
                    if (vCheckFilter == 1) {
                        var a = reply.Load.slice(0, -1);
                        var b = a + vWhere + ';';
                        vScriptArray.push(b);
                    } else {
                        vScriptArray.push(reply.Load);
                    };

                    if(vLimit != 0) {
                        var a = vScriptArray[0];
                        console.log(a);
                        var b = a.slice(0, -1);
                        var c = b + 'LIMIT ' + vLimit + ';';
                        console.log(c);
                        vScriptArray[0] = c;
                    }

                }

                

                vSelectedTableProp.push([
                    vcycle, {
                        'SCHEMA': reply.Schema,
                        'TABLE': reply.Table,
                        'COLUMN': reply.Column,
                        'DIMENSION': reply.Dimension,
                        'MEASURE': reply.Measure
                    }
                ]);
                console.log('vScriptArray:');
                console.log(vScriptArray);
                console.log('vcycle:');
                console.log(vcycle);
                console.log('vSelectedTableProp:');
                console.log(vSelectedTableProp);
                vcycle++;
                app.destroySessionObject(reply.qInfo.qId);

                $('#myTab a[href="#Script"]').tab('show');
                $('.progress-bar').css('width', '65%');
                CreateScriptTable();
            }
        });

        //Create Table in Script Section
        function CreateScriptTable() {
            var schema = vSelectedTableProp[vcycle][1].SCHEMA;
            var table = vSelectedTableProp[vcycle][1].TABLE;
            var column = vSelectedTableProp[vcycle][1].COLUMN;
            var dim = vSelectedTableProp[vcycle][1].DIMENSION;
            var mes = vSelectedTableProp[vcycle][1].MEASURE;
            var script = vScriptArray[vcycle];

            if (dim != '') {
                $('#Scripttable').append('<table style="table-layout: fixed;"><tbody><tr><td class="selcoltable selrowtable">' + schema + '</td><td class="selcoltable selrowtable">' + table + '</td><td class="selcoltable selrowtable">' + dim + ', ' + mes + '</td></tr></tbody></table><table><tbody><tr><td><pre id="LoadScript' + vcycle + '"class="scriptcode hiddenscript">' + script + '<a href="#" id="hidescript' + vcycle + '"><span style="float: right;" class="glyphicon glyphicon-minus"></span></a></pre><pre class="scriptcode" id="Placeholderscript' + vcycle + '">Show Script<a href="#" id="showscript' + vcycle + '"><span style="float: right;" class="glyphicon glyphicon-plus"></span></a></pre></td></tr></tbody></table>');

            } else {
                $('#Scripttable').append('<table style="table-layout: fixed;"><tbody><tr><td class="selcoltable selrowtable">' + schema + '</td><td class="selcoltable selrowtable">' + table + '</td><td class="selcoltable selrowtable">' + column + '</td></tr></tbody></table><table><tbody><tr><td><pre id="LoadScript' + vcycle + '"class="scriptcode hiddenscript">' + script + '<a href="#" id="hidescript' + vcycle + '"><span style="float: right;" class="glyphicon glyphicon-minus"></span></a></pre><pre class="scriptcode" id="Placeholderscript' + vcycle + '">Show Script<a href="#" id="showscript' + vcycle + '"><span style="float: right;" class="glyphicon glyphicon-plus"></span></a></pre></td></tr></tbody></table>');

            };
            scripttableshow();
            scripttablehide();
        };

        //show or hide script
        function scripttableshow() {
            $('[id^=showscript]').on('click', function () {
                $('#Placeholderscript' + this.id.slice(-1)).hide();
                $('#LoadScript' + this.id.slice(-1)).show();

            });
        };

        function scripttablehide() {
            $('[id^=hidescript]').on('click', function () {
                $('#LoadScript' + this.id.slice(-1)).hide();
                $('#Placeholderscript' + this.id.slice(-1)).show();

            });
        };

        $('#addtables').on('click', function () {
            vDDCheck = 'off';
            vCheckFilter = 0;

            $('#Filterbody').hide();
            $(".Filter_Fields").html("");
            $("#Filter_row_1").siblings().remove();
            whileconfigrow = '';
            addhtmlfields = '';


            $('input[name="DDCheck"]').bootstrapSwitch('state', false);
            app.clearAll();
            app.variable.setStringValue('vLimit','0');
            $('#myTab a[href="#Table"]').tab('show');
            $('.progress-bar').css('width', '35%');
            var vTimeout5 = setTimeout(myTimer5, 100);
            function myTimer5() {
                qlik.resize();
            };
            $('#Limit').show();
            $('#Limit').removeClass('btn-success');
            $('#Limit').addClass('btn-default');
        });

        //show hide Filterbody
        $('#AddFilter').on('click', function () {
            vCheckFilter = 1;

            app.createGenericObject({
                TYPE: {
                    qStringExpression: "=Getfieldselections([Column],',',100)"
                }
            }, function (fields) {
                var addfieldstofilter = fields.TYPE.split(",");
                addhtmlfields = '<select class="selectpicker">';

                $.each(addfieldstofilter, function (key, value) {
                    addhtmlfields += "<option>" + value + "</option>";
                });

                addhtmlfields += '</select>';
                $('.Filter_Fields').append(addhtmlfields);
                return (fields);
            }).then(function (fields) {
                $('.selectpicker').selectpicker();
                return (fields);
            }).then(function (fields) {
                $('#Filterbody').show();
                console.log(fields);
                app.destroySessionObject(fields.id)
            });
        });

        $('#closeFilterbody').on('click', function () {
            $('#Filterbody').hide();
            $(".Filter_Fields").html("");
            $("#Filter_row_1").siblings().remove();
            whileconfigrow = '';
            addhtmlfields = '';

        });

        //Add another Filteroption
        whileconfigrownum++;

        $("body").delegate('.Filter_add_left', 'click', function () {
            whileconfigrow = '<tr id=Filter_row_' + whileconfigrownum + '><td id="Filter_row_' + whileconfigrownum + '_Operator"><select class="selectpicker"><option>AND</option><option>OR</option></select></td>';
            whileconfigrow += '<td id="Filter_row_' + whileconfigrownum + '_Field"><div class="Filter_Fields">' + addhtmlfields + '</div></td>';
            whileconfigrow += ' <td id="Filter_row_' + whileconfigrownum + '_Option"><select class="selectpicker"><option>></option><option><</option><option>=</option><option>>=</option><option><=</option><option><></option></select></td>';
            whileconfigrow += '<td id="Filter_row_' + whileconfigrownum + '_Input"><div class="form-group inputtext"><input type="text" class="form-control" id="Filter_Value_' + whileconfigrownum + '"></div></td>';
            whileconfigrow += '<td><div class="Filter_add_left"><a><span id="Filter_row_' + whileconfigrownum + '_Add" class="glyphicon glyphicon-plus"></span></a></div><div class="Filter_add_right"><a><span id="Filter_row_' + whileconfigrownum + '_Delete" class="glyphicon glyphicon-minus"></span></a></div></td></tr>';

            $(whileconfigrow).insertAfter('#' + $(this).closest("tr").attr('id'));
            $('.selectpicker').selectpicker();
            whileconfigrownum++;
            console.log($('#Filterbody tr').length);
            console.log('ausgeführt');
        });

        //Remove a Filteroption
        $("body").delegate('.Filter_add_right', 'click', function () {
            $('#' + $(this).closest("tr").attr('id')).remove();
            //Count # rows
            console.log($('#Filterbody tr').length);
        });

        //Limit
        $('#Limit').on('click',function(){
            $('#modalLimit').modal();
        });

        $('#applyLimit').on('click',function(){
           vLimit = ($('#valueLimit').val());
           app.variable.setStringValue('vLimit',$('#valueLimit').val());
           $('#modalLimit').modal('toggle');
           $('#Limit').removeClass('btn-default');
           $('#Limit').addClass('btn-success');
           $('#RowAmount').empty();
           $('#RowAmount').append(formatNumber(vLimit));
        });

        //Table and Column details
        $('#details1, #details2').on('click', function(){
            $('#modalDetails').modal();
            qlik.resize();
        })

        //Amount Information for Selection
        app.createGenericObject({
            DBAmount: {
                qStringExpression: "=$(vDBAmount)"
            },
            DisValues: {
                qStringExpression: "=$(vDistinctValues)"
            },
            RowAmount: {
                qStringExpression: "=$(vRowAmount)"
            },           
            DistinctValuesAmount: {
                qStringExpression: "=$(vDistinctValues)"
            }
        }, function(data){
            $('#DBAmount').empty();
            $('#DBAmount').append(data.DBAmount);
            $('#RowAmount').empty();
            if(vLimit != 0){
                $('#RowAmount').append(formatNumber(vLimit));
            } else{ 
                if(data.RowAmount === '0') {
                    $('#RowAmount').append('N/A');
                }else{
                    $('#RowAmount').append(formatNumber(data.RowAmount));
                }  
            } 

            $('#DisValues').empty();
            $('#DisValues').append(formatNumber(data.DisValues));         
        });

        //Apply selected Tables
        $('#applyseltables').on('click', function () {

            $('#infodatacon').empty();
            $('#infodatasource').empty();
            $('#infotables').empty();
            $('#infoc').empty();

            $('#myTab a[href="#Reload"]').tab('show');
            $('.progress-bar').css('width', '100%');

            //Create final Script
            vfinalscript += vDataConnection + '\n\n';
            for (var i = 0; i < vScriptArray.length; i++) {
                var table = vSelectedTableProp[i][1].TABLE;
                vfinalscript += '///$tab "' + table + '"\r\n';
                vfinalscript += vScriptArray[i];
                vfinalscript += '\n\n';
            };

            vfinalscript += 'disconnect;';
            console.log(vfinalscript);

            //Display Overview

            //Fill Variables
            //vSelectedTableProp
            var vinfosource = [];
            var vinfotable = [];
            var vinfoc = [];
            var vtablecol = [];
            var avmes = [];
            var avdim = [];

            for (var i = 0; i < vSelectedTableProp.length; i++) {
                vinfosource.push(vSelectedTableProp[i][1].TABLE);

                if (vSelectedTableProp[i][1].DIMENSION != "") {
                    var a = vSelectedTableProp[i][1].DIMENSION;
                    var str1 = a.split(', ');
                    vinfoc = vinfoc.concat(str1);
                    avdim = avdim.concat(str1);

                    var b = vSelectedTableProp[i][1].MEASURE;
                    var str2 = b.split(', ');
                    vinfoc = vinfoc.concat(str2);
                    avmes = avmes.concat(str2);
                } else {
                    vinfotable.push(vSelectedTableProp[i][1].TABLE);
                    var c = vSelectedTableProp[i][1].COLUMN;
                    var str3 = c.split(', ');
                    vinfoc = vinfoc.concat(str3);
                    vtablecol = vtablecol.concat(str3);
                }
            }

            //Append content to table
            $('#infodatacon').append(vDataconnection_transfer);

            $.each(vinfosource, function (index, value) {
                $('#infodatasource').append('<li class="listicon" style="list-style: none; left: 2em; position: relative;">' + value + '</li>');
            });

            $.each(vinfotable, function (index, value) {
                $('#infotables').append('<li class="listicon" style="list-style: none; left: 2em; position: relative;">' + value + '</li>');
            });

            console.log(vinfoc);
            $.each(vinfoc, function (index, value) {
                $('#infoc').append('<li class="listicon" style="list-style: none; left: 2em; position: relative;">' + value + '</li>');
            });

            //Infochart
            var a = vinfosource.length;
            var b = vinfotable.length;
            var c = vtablecol.length;
            var e = avdim.length;
            var f = avmes.length;

            app.visualization.create('barchart',
            [
                {
                    qDef: {
                        qFieldDefs: ["=ValueList('Data-Sources','Tables','Columns','Dimensions','Measures')"],
                        "qFieldLabels": ["Selection"],
                        "qSortCriterias": [
                            { "qSortByLoadOrder": 1 }
                        ]
                    },
                },
                {
                    qDef: {
                        qDef: "=pick(rowno()," + a + "," + b + "," + c + ","  + e + "," + f + ")",
                        qLabel: "Amount"
                    }
                }
            ],
            {
                "showTitles": false,
                "dimensionAxis": {
                    "show": "labels",
                    "dock": "far"
                },
                "measureAxis": {
                    "show": "labels"
                },
                "orientation": "horizontal",
                "dataPoint": { "showLabels": true },
                "color": {
                    "auto": false,
                    "mode": "byExpression"
                }
            }
            ).then(function (barchart) {
                barchart.show('QVINFO');
                qlik.resize();
            });
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

                scope.$watch(function() { return global.session.__enigmaApp }, function (newValue, oldValue) {

                    if (newValue) {
                        $.notify({ icon: 'glyphicon glyphicon-ok', message: 'Connection to Qlik Sense Server establised.' }, { type: 'success', placement: { from: 'bottom', align: 'right' } });                        
                        scope.enigma = newValue;
                        console.log("bound Enigma", scope.enigma);
                        vApp = vNamespace + '_' + vTimestamp;
                        scope.enigma.createApp(vNamespace + '_' + vTimestamp).then(function(newApp){
                                $.notify({ icon: 'glyphicon glyphicon-ok', message: 'APP: <b>' + vApp + '</b> created successfully. ID: ' + '<b>' + newApp.qAppId + '</b>' }, { type: 'success', placement: { from: 'bottom', align: 'right' } }, { newest_on_top: true });
                            vAppID = newApp.qAppId;
                            //console.log('newApp.qAppId',newApp.qAppId);
                            console.log('newApp',newApp);
                            scope.enigma.openDoc(vAppID).then(function(conns){
                                console.log('conns',conns);
                                new_app = conns;
                                    var myscript = vfinalscript;
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

                                new_app.setScript(localsettings + myscript)
                                    $.notify({ icon: 'glyphicon glyphicon-ok', message: 'LoadScript appended successfully.' }, { type: 'success', placement: { from: 'bottom', align: 'right' } });
                                    notify = $.notify({ icon: 'glyphicon glyphicon-refresh glyphicon-refresh-animate', message: 'Indexing application...<br><div id="progress"></div><div id="progressstatus"></div>' }, { type: 'info', timer: '1000000', placement: { from: 'bottom', align: 'right' } });
                                console.log('Reload:');
                                return new_app.doReload();
                            }).then(function() {
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

        //Building Timestamps
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
        function formatNumber(nStr) {
            nStr += '';
            x = nStr.split('.');
            x1 = x[0];
            x2 = x.length > 1 ? '.' + x[1] : '';
            var rgx = /(\d+)(\d{3})/;
            while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + vThousandSeperator + '$2');
            }
            return x1 + x2;
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

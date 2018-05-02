/**
 * Logic and html generation for the selection section
 */
define(function () {

    function recreateSelectionRows(selectionObjs) {
        $('.selection-row').remove();
        for (selectionIndex in selectionObjs) {
            selection = selectionObjs[selectionIndex]
            // Populate the next row of entries
            $('#databases-selected').append(`
            <div id='database-div-${selectionIndex}' class='selection-row selections-container-database'>
                <p id='database-${selectionIndex}'>
                <p>
            </div>`)
            for (dbIndex in selection.currentDbs) {
                $('#database-' + selectionIndex).append(selection.currentDbs[dbIndex])
            }
            $('#tables-selected').append(`
            <div id='table-div-${selectionIndex}' class='selection-row selections-container-table'>
                <p id='table-${selectionIndex}'>
                </p>
            </div>`)
            for (tableIndex in selection.currentTables) {
                $('#table-' + selectionIndex).append(selection.currentTables[tableIndex])
            }
            $('#columns-selected').append(`
            <div id='columns-div-${selectionIndex}' class='selection-row selections-container-column'>
                <p id='columns-${selectionIndex}'>
                </p>
            </div>`)
            // Add button each time to allow deletion
            $('#columns-' + selectionIndex).append(`<button type="button" class="close remove-row" aria-label="Close"><span aria-hidden="true">&times;</span></button>`)
            if(selection.currentCols.length < 3){                
                for (colIndex in selection.currentCols) {
                    if(colIndex == selection.currentCols.length - 1){
                        // Reached the end of the list
                        $('#columns-' + selectionIndex).append(selection.currentCols[colIndex].trim())
                    }
                    else{
                        $('#columns-' + selectionIndex).append(selection.currentCols[colIndex].trim() + ", ")
                    }
                }
            }
            else{
                $('#columns-' + selectionIndex).append(selection.currentCols[0] + " ... " + selection.currentCols[selection.currentCols.length - 1])
                // for (colIndex in selection.currentCols) {
                //     $('#columns-' + selectionIndex).append("<p>" + selection.currentCols[colIndex] + "</p>")
                // }
            }
        }
    }

    return {
        checkColumnNamesExist: function(currentCols, app){
            if(currentCols.length == 1 && currentCols[0].includes("of")){
                app.getList('SelectionObject', function (selectionObj) {
                    console.log(selectionObj)
                    var currentSelections = selections.updateCurrentSelections(selectionObj, currentDbs, currentTables, currentCols)
                    currentDbs = currentSelections[0]
                    currentTables = currentSelections[1]
                    currentCols = currentSelections[2]
                });
                
            }
            return(currentCols)
        },
        updateCurrentSelections: function (selectionObj, currentDbs, currentTables, currentCols) {
            // loop through each table
            for (var fieldIndex in selectionObj.qSelectionObject.qSelections) {
                // get the current table object
                fieldObj = selectionObj.qSelectionObject.qSelections[fieldIndex]
                selectedArray = fieldObj.qSelected.split(',')
                if (fieldObj.qField === "db_name") {
                    currentDbs = selectedArray
                }
                if (fieldObj.qField === "table_name") {
                    currentTables = selectedArray
                }
                if (fieldObj.qField === "Column") {
                    currentCols = selectedArray
                }
                if (fieldObj.qField === "table_name" && fieldObj.qSelectedCount > 1) {
                    console.log('Too many tables. In order to maintain associations please add tables one at a time')
                    $("#column-section").css("display", "none")
                    $("#too-many-tables").css("display", "block")
                }
                else if (fieldObj.qField === "db_name" && fieldObj.qSelectedCount > 1) {
                    console.log('Too many tables. In order to maintain associations please add tables one at a time')
                    $("#column-section").css("display", "none")
                    $("#table-section").css("display", "none")
                    $("#too-many-dbs").css("display", "block")
                }
                else {
                    $("#column-section").css("display", "block")
                    $("#table-section").css("display", "block")
                    $("#too-many-tables").css("display", "none")
                    $("#too-many-dbs").css("display", "none")
                }
            }
            return [currentDbs, currentTables, currentCols]
        },

        recreateSelectionRows: function(selectionObjs) {
            recreateSelectionRows(selectionObjs)
        },
        removeSelectionRow: function(rowId, selectionObjs){
            // romve this row from the users selections 
            selectionObjs.splice(rowId, 1);
            // recreate all rows to maintain the ordering
            recreateSelectionRows(selectionObjs)
        }
    }
})
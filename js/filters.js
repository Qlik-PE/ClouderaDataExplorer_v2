/**
 * Logic and html generation for the filter section
 */
define(function(){
    const selectPickerOpen = '<select class="selectpicker">';
    const selectPickerClose = '</select>';  

    function getCurrentFilterSources(){
        var currentFilterSources = [];
        $(".filter-source-fields").each(function(){
            currentFilterSources.push($(this).find("button").text().trim());
        })
        return(currentFilterSources)
    }

    function getCurrentFilterCount(newFilterSource, currentFilterSources){
        var count = 0
        for (sourceIndex in currentFilterSources){
            if(currentFilterSources[sourceIndex] == newFilterSource){
                count++;
            }
        }
        return count
    }

    return{
        addFilterRow: function(newFilterRowNum, sourceFieldOptions, colFieldOptions){            
            // logical operator column
            newFilterRow = `<tr id=filter-row-${newFilterRowNum}>
            <td id="filter-row-operator-${newFilterRowNum}">
                <select class="selectpicker">
                    <option>AND</option>
                    <option>OR</option>
                </select>
            </td>`;
            // Database and Table column
            newFilterRow += `<td id="filter-row-source-${newFilterRowNum}">
            <div class="filter-source-fields">${selectPickerOpen}${sourceFieldOptions}${selectPickerClose}
            </div>
            </td>`;
            // Col Coumn
            newFilterRow += `<td id="filter-row-col-${newFilterRowNum}">
            <div class="filter-col-fields">${selectPickerOpen}${colFieldOptions}${selectPickerClose}
            </div>
            </td>`;
            // Operator
            newFilterRow += `<td id="filter-row-option-${newFilterRowNum}">
            <select class="selectpicker">
                <option>
                    >
                </option><option>
                    <
                </option><option>
                    =
                </option><option>
                    >=
                </option><option>
                    <=
                </option><option>
                    <>
                </option>
            </select>
            </td>`;
            // Text Input
            newFilterRow += `<td id="filter-row-input-${newFilterRowNum}">
            <div class="form-group inputtext">
                <input type="text" class="form-control" id="Filter_Value_${newFilterRowNum}">
            </div>
            </td>`;
            // Add or Delete
            newFilterRow += `<td id="filter-row-remove-${newFilterRowNum}" class="remove-filter">
            <span class="glyphicon glyphicon-remove remove-filter-btn"></span>
            </td>
            </tr>`;
            return newFilterRow
        },
        updateFilterSourceOptions: function(selectionObjs, sourceFieldOptions){
            // add only the newly made selections if not already present in filter options
            if(!sourceFieldOptions.includes(selectionObjs[selectionObjs.length-1]).currentTables){
                sourceFieldOptions += "<option>" + selectionObjs[selectionObjs.length - 1].currentDbs + "-" + selectionObjs[selectionObjs.length - 1].currentTables + "</option>";
            }
            // if(!sourceFieldOptions.includes(selectionObjs[selectionObjs.length-1]).current){
            //     for (colIndex in selectionObjs[selectionObjs.length - 1].currentCols) {
            //         //colFieldOptions += "<option>" + selectionObjs[selectionObjs.length - 1].currentCols[colIndex] + "</option>";
            //         colFieldOptions.push(selectionObjs[selectionObjs.length - 1].currentCols)
            //     }
            // }
            // Update any filter rows that already exist
            $(".filter-source-fields").html(selectPickerOpen + sourceFieldOptions + selectPickerClose)
            $('.selectpicker').selectpicker();       

            return sourceFieldOptions
        },
        updateFilterColOptions: function(selectionObjs, sourceElement){
            let sourceText = sourceElement.find("button").text().trim()            
            let colFieldOptions = ""
            for(selectionIndex in selectionObjs){
                if (selectionObjs[selectionIndex].currentDbs[0]+"-"+selectionObjs[selectionIndex].currentTables[0] === sourceText){
                    for(colIndex in selectionObjs[selectionIndex].currentCols){
                        if (!colFieldOptions.includes(selectionObjs[selectionIndex].currentCols[colIndex])){
                            colFieldOptions += "<option>" + selectionObjs[selectionIndex].currentCols[colIndex] + "</option>";
                        }
                    }
                }
            }
            let element = sourceElement.eq(0).parent()
            element = element.next()
            element = element.find(">:first-child")
            sourceElement.eq(0).parent().next().find(">:first-child").html(selectPickerOpen + colFieldOptions + selectPickerClose)  
            $('.selectpicker').selectpicker();       
            
            return colFieldOptions  
        },
        updateAllOperators: function(){
            // get all current sources
            let currentSources = getCurrentFilterSources()
            let filterIndex = 0
            $(".filter-source-fields").each(function(){
                currentFilterSource = ($(this).find("button").text().trim());
                if(currentSources.slice(0, filterIndex).contains(currentFilterSource)){
                    $(this).eq(0).parent().prev().find(">:first-child").html(
                        `<select class="selectpicker">
                            <option>AND</option>
                            <option>OR</option>
                        </select>`
                    );
                    $('.selectpicker').selectpicker();  
                }
                else{
                    $(this).eq(0).parent().prev().find(">:first-child").html("")                    
                }
                filterIndex++;

            })
        },
        initialColOptions: function(selectionObjs){
            //let sourceText = sourceElement.find("button").text().trim()            
            let colFieldOptions = ""
            for(colIndex in selectionObjs[0].currentCols){
                colFieldOptions += "<option>" + selectionObjs[0].currentCols[colIndex] + "</option>";
            }
            $(".filter-col-fields").html(selectPickerOpen + colFieldOptions + selectPickerClose)  
            $('.selectpicker').selectpicker();       
            
            return colFieldOptions  
        },
        extractFiltersFromHTML: function(){
            var filterObjs = []
            
            // Build where clause from each of the filters
            $('#Filterbody tbody tr').each(function () {
                
                let currentFilter = {}

                let currentFilterRowNum = this.id.slice(-1);

                let parameters = Array.from($(this).find(':nth-child(1)').find(':selected')).map(function (item) {
                    return $(item).text();
                });
    
                let textValue = $('input[id^="Filter_Value_' + currentFilterRowNum + '"]').val();

                // first filter for this table
                // TODO: Only Show logical operator in UI if it is not the first occurance of table
                if (parameters.length == 3){
                    currentFilter = {
                        'rowNum': currentFilterRowNum,
                        'operator': "",
                        'database': parameters[0].split("-")[0],
                        'table': parameters[0].split("-")[1],
                        'column': parameters[1],
                        'relationship': parameters[2],
                        'textValue': textValue,
                    }
                }
                else{
                    currentFilter = {
                        'rowNum': currentFilterRowNum,
                        'operator': parameters[0],
                        'database': parameters[1].split("-")[0],
                        'table': parameters[1].split("-")[1],
                        'column': parameters[2],
                        'relationship': parameters[3],
                        'textValue': textValue,
                    }
                }

                filterObjs.push(currentFilter);
            });

            return filterObjs
        }
    }
})
({
    buildColumns: function (cmp, helper, fieldDescriptionList) {
        var columns = [ { label: 'Name', fieldName: 'LinkName', type: 'url', typeAttributes: {label: { fieldName: 'Name' }, target: '_top'} }
                      ]
        fieldDescriptionList.forEach(function(fieldDescription){
            if(fieldDescription.apiName != 'Name'){             
                var column = {label: fieldDescription.label, fieldName: fieldDescription.apiName, type: fieldDescription.type.toLowerCase()}
                if(column.type === 'currency'
                   || column.type === 'percent'){
                    column.cellAttributes = { alignment: 'left' }
                }else if(column.type === 'date'){
                    column.typeAttributes = {month:"2-digit", day:"2-digit"}
                    column.type = 'date-local'
                }else if(column.type === 'reference'){
                    var linkName = fieldDescription.apiRelationshipName + '_' + fieldDescription.apiNameOnParent
                    var fieldName = fieldDescription.apiRelationshipName + '_LinkName'
                    column.typeAttributes = {label: { fieldName: linkName }, target: '_top'}
                    column.type = 'url'
                    column.fieldName = fieldName
                }
                columns.push(column)
            }
        })
        columns.push({ label: 'Relevancy', fieldName: 'relevancy', type: 'text'})
        return columns
	},
    
    fetchData: function(cmp, helper, allRecords, records){        
        var rowsToLoad = cmp.get('v.rowsToLoad')
        var newData = allRecords.slice(records.length, records.length + rowsToLoad)
		records = records.concat(newData)
        return records
        
    } ,
    
    flattenStructure : function (helper,topObject, prefix, toBeFlattened) {
        for (const prop in toBeFlattened) {
            const curVal = toBeFlattened[prop];
            if (typeof curVal === 'object') {
                helper.flattenStructure(helper, topObject, prefix + prop + '_', curVal);
            } else {
                topObject[prefix + prop] = curVal;
            }
        }
    },   
    
    processRecords : function (cmp, helper, records, bookmarkedIds) {
        var preselectedRows = new Set(cmp.get('v.preselectedRows'))
        var bookmarkedIdsSet = new Set(bookmarkedIds)
        var allFields = cmp.get('v.allFields')
        var opportunity = cmp.get('v.opportunity')
		var maxRelevancyScore = cmp.get('v.fieldDescriptionList').length       
        records.forEach(function(record){
            record.LinkName = '/'+record.Id
            record.relevancyScore = 0;
            allFields.forEach(function(field){
                if(record[field] === opportunity[field] && record[field] != null){
                    record.relevancyScore++
                }
            })
            record.relevancy = record.relevancyScore + '/' + maxRelevancyScore
            if(bookmarkedIdsSet.has(record.Id)){
                preselectedRows.add(record.Id)
            }
            for (const col in record) {
                const curCol = record[col];
                if (typeof curCol === 'object') {
                    const newVal = curCol.Id ? ('/' + curCol.Id) : null;
                    helper.flattenStructure(helper,record, col + '_', curCol);
                    if (newVal !== null) {
                        record[col+ '_LinkName'] = newVal;
                    }
                }
            }
        }); 
        records.sort(function(a, b){return b.relevancyScore - a.relevancyScore});
        cmp.set('v.preselectedRows', preselectedRows)
    },     
    
    findSimilarOpportunities : function(cmp, helper, actionName, jsonData) {   
        var action = cmp.get(actionName)
        action.setParams({jsonData : jsonData})       
        action.setCallback(this, function(response) {
            var state = response.getState()
            if (state === "SUCCESS") {
                var jsonData = JSON.parse(response.getReturnValue())
                helper.processRecords(cmp, helper, jsonData.records, jsonData.bookmarkedRecords)               
                cmp.set('v.allRecords', jsonData.records)
                var records = helper.fetchData(cmp, helper, jsonData.records, [])
                cmp.set('v.records', records)           
            }else if (state === "ERROR") {
                helper.handleErrorResponse(response)
            }
        })
        $A.enqueueAction(action)        
    },        
    
    navigateToOpportunity : function(cmp, helper, recordId) {   
        var navEvt = $A.get("e.force:navigateToSObject");
        navEvt.setParams({
            recordId: recordId
        });
        navEvt.fire();      
    },     
    
    handleErrorResponse : function(response) {   
        var errors = response.getError()
        if (errors) {
            if (errors[0] && errors[0].message) {
                console.log("Error message: " + errors[0].message)
            }
        } else {
            console.log("Unknown error")
        }     
    },     
})
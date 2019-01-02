({
	loadData : function(cmp, helper, action, jsonData) {   
        action.setParams({jsonData : jsonData});
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                var jsonData = JSON.parse(response.getReturnValue())
                helper.processRecords(cmp, helper, jsonData.records)   
                var records = cmp.get('v.records')
                var newData = records.concat(jsonData.records)
                cmp.set('v.records', newData)
                cmp.set('v.totalNumberOfRows', jsonData.totalNumberOfRows)    
                if(jsonData.fieldDescriptionList){
                    var columns = helper.buildColumns(cmp, helper, jsonData.fieldDescriptionList)
                    cmp.set('v.columns', columns)                         
                }
                
            }else if (state === "ERROR") {
                helper.handleErrorResponse(response)
            }
        });
        
        $A.enqueueAction(action);    
   
	},
    
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
    
    processRecords : function (cmp, helper, records) {
        records.forEach(function(record){
            record.LinkName = '/'+record.Id
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
    }, 
    
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
        var actions = {
            type: 'action', 
            typeAttributes: { rowActions: [{ label: 'Delete', name: 'delete' }] }
        }         
        columns.push(actions)
        return columns
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
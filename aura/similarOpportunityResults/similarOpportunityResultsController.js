({
    init : function(cmp, event, helper) {
        
        var nodes = cmp.get('v.nodes')
        var columns = [ { label: 'OPPORTUNITY  Name', fieldName: 'LinkName', type: 'url', typeAttributes: {label: { fieldName: 'Name' }, target: '_top'} }
                      ]
        nodes.forEach(function(node){
            var column = {label: node.label, fieldName: node.apiName, type: node.type.toLowerCase()}
            if(column.type === 'currency'
               || column.type === 'percent'){
                column.cellAttributes = { alignment: 'left' }
            }else if(column.type === 'date'){
                column.typeAttributes = {month:"2-digit", day:"2-digit"}
                column.type = 'date-local'
            }else if(column.type === 'reference'){
                var linkName = node.apiRelationshipName + '_' + node.apiNameOnParent
                var fieldName = node.apiRelationshipName + '_LinkName'
                column.typeAttributes = {label: { fieldName: linkName }, target: '_top'}
                column.type = 'url'
                column.fieldName = fieldName
            }
            columns.push(column)
        })
        
        cmp.set('v.columns', columns)		
        
        var action = cmp.get("c.initData")
        var allFields = cmp.get("v.allFields")
        var selectedFields = JSON.parse(JSON.stringify( allFields ));
        cmp.set("v.selectedFields", selectedFields)
        var opportunity = cmp.get("v.opportunity")
        var rowsToLoad = cmp.get("v.rowsToLoad")
        var jsonData = JSON.stringify({fields:allFields.join(','),
                                       recordId:opportunity.Id,
                                       lastNMonths:cmp.get("v.selectedMonth"),
                                       rowsToLoad:rowsToLoad
                                      });
        action.setParams({jsonData : jsonData});
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                var jsonData = JSON.parse(response.getReturnValue())
                var records = jsonData.records
                helper.processRecords(cmp, helper, records)               
                cmp.set('v.records', records)
                cmp.set('v.totalNumberOfRows', jsonData.totalNumberOfRows)    
                 
                
            }else if (state === "ERROR") {
                var errors = response.getError();
                if (errors) {
                    if (errors[0] && errors[0].message) {
                        console.log("Error message: " + errors[0].message);
                    }
                } else {
                    console.log("Unknown error");
                }
            }
        });
        
        $A.enqueueAction(action);         
    },
    
    loadMoreData: function (cmp, event, helper) {
        var totalNumberOfRows = cmp.get('v.totalNumberOfRows')
        var records = cmp.get('v.records')

        
        if(records.length < totalNumberOfRows){
            
            event.getSource().set("v.isLoading", true);
            
            var promiseData = helper.fetchData(cmp, helper)
            
            promiseData.then($A.getCallback(function (data) {
                var totalNumberOfRows = cmp.get('v.totalNumberOfRows')
                var currentData = cmp.get('v.records')
                var newData = currentData.concat(data);
                cmp.set('v.records', newData);
                var preselectedRows = cmp.get('v.preselectedRows')
                var resultFrid = cmp.find('result-grid')
                resultFrid.set('v.selectedRows', preselectedRows)                 
                if (newData.length >= totalNumberOfRows) {
                    cmp.set('v.enableInfiniteLoading', false);
                } 
                event.getSource().set("v.isLoading", false)
            }));
        }else{
			cmp.set('v.enableInfiniteLoading', false);            
        }
        
    },    
    
 	handleSimilarOpportunityCriteriaChanged : function(cmp, event, helper) {   
        var selectedMonth = event.getParam("selectedMonth")
        cmp.set("v.selectedMonth", selectedMonth)
        var allFields = event.getParam("allFields")
        var selectedFields = event.getParam("selectedFields")
        cmp.set("v.selectedFields", selectedFields)
        
        var opportunity = cmp.get("v.opportunity")
        var rowsToLoad = cmp.get("v.rowsToLoad")        
        
        var jsonData = JSON.stringify({
            opportunity:opportunity, 
            fields:allFields.join(','),
            selectedFields:selectedFields.join(','),
			lastNMonths:selectedMonth,
            rowsToLoad:rowsToLoad,
            rowsToSkip:0            
        });        
        helper.findSimilarOpportunities(cmp, helper, jsonData)     
    },
    
    handleBokmarkButton: function (cmp, event, helper) {
        var preselectedRows = cmp.get('v.preselectedRows')
        var selectedRowSet = new Set(cmp.find('result-grid').get('v.selectedRows'))
        preselectedRows.forEach(function(record){
	        selectedRowSet.delete(record)
            
        })
        var action = cmp.get("c.bookmarkOpportunities")
        var opportunity = cmp.get("v.opportunity")
        
        var jsonData = JSON.stringify({
            recordId:opportunity.Id, 
            opportunityIds:Array.from(selectedRowSet)
        });
        action.setParams({jsonData : jsonData});        
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                helper.navigateToOpportunity(cmp, helper, opportunity.Id)               
            }else if (state === "ERROR") {
                var errors = response.getError();
                if (errors) {
                    if (errors[0] && errors[0].message) {
                        console.log("Error message: " + errors[0].message);
                    }
                } else {
                    console.log("Unknown error");
                }
            }
        })
        $A.enqueueAction(action) 
    },    
    
    handleonrowselection: function (cmp, event, helper) {
        var selectedRowsFromEvent = event.getParam('selectedRows')
        var preselectedRows = cmp.get("v.preselectedRows")
        var selectedRowSet = new Set(preselectedRows)
        selectedRowsFromEvent.forEach(function(row){
            selectedRowSet.add(row.Id)
        })
        var resultFrid = cmp.find('result-grid')
        resultFrid.set('v.selectedRows', Array.from(selectedRowSet))        
    },    
    
    handleCancelButton: function (cmp, event, helper) {
        var opportunity = cmp.get("v.opportunity")
        helper.navigateToOpportunity(cmp, helper, opportunity.Id)     
    },     
})
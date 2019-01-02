({
    init : function(cmp, event, helper) {     
        var resultGrid = cmp.find('result-grid')
        if(resultGrid){
	        resultGrid.set('v.selectedRows', [])              
	        cmp.set('v.preselectedRows', [])              
        }
        var fieldDescriptionList = cmp.get('v.fieldDescriptionList')
        var columns = helper.buildColumns(cmp, helper, fieldDescriptionList)

        cmp.set('v.columns', columns)		
        
        var actionName = "c.findSimilarOpportunities"
        var opportunity = cmp.get("v.opportunity")
        var jsonData = JSON.stringify({allFields:cmp.get("v.allFields").join(','), 
							           selectedFields:cmp.get("v.selectedFields").join(','),
            						   opportunity:opportunity,                                        
                                       lastNMonths:cmp.get("v.selectedMonth"),
                                       rowsToLoad:cmp.get("v.rowsToLoad"),
                                       rowsToSkip:0,  
                                       isStrictMode: false
                                      });  
        helper.findSimilarOpportunities(cmp, helper, actionName, jsonData)   
    },    
    
    handleShowMore: function (cmp, event, helper) {
        var allRecords = cmp.get('v.allRecords')
        var records = cmp.get('v.records')
		var records = helper.fetchData(cmp, helper, allRecords, records)
        cmp.set('v.records', records)                
    },    
    
 	handleSimilarOpportunityCriteriaChanged : function(cmp, event, helper) {   
        var selectedMonth = event.getParam("selectedMonth")
        cmp.set("v.selectedMonth", selectedMonth)
        var allFields = cmp.get("v.allFields")
        var selectedFields = event.getParam("selectedFields")
        cmp.set("v.selectedFields", selectedFields)        
        var isStrictMode = event.getParam("isStrictMode")
        
        var jsonData = JSON.stringify({
            opportunity:cmp.get("v.opportunity"), 
            allFields:allFields.join(','),
            selectedFields:selectedFields.join(','),
			lastNMonths:selectedMonth,
            rowsToLoad:cmp.get("v.rowsToLoad"),
            rowsToSkip:0,  
            isStrictMode: isStrictMode
        });        
        var actionName = "c.findSimilarOpportunities"
        helper.findSimilarOpportunities(cmp, helper, actionName, jsonData)     
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
                helper.handleErrorResponse(response)
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
        var resultGrid = cmp.find('result-grid')
        resultGrid.set('v.selectedRows', Array.from(selectedRowSet))        
    },    
    
    handleCancelButton: function (cmp, event, helper) {
        var opportunity = cmp.get("v.opportunity")
        helper.navigateToOpportunity(cmp, helper, opportunity.Id)     
    },     
    
    handleRecordsChange: function (cmp, event, helper) {
        var preselectedRows = new Set(cmp.get('v.preselectedRows'))
        var resultGrid = cmp.find('result-grid')
        if(resultGrid){
            var selectedRows = new Set(resultGrid.get('v.selectedRows'))
	        preselectedRows = new Set([...preselectedRows, ...selectedRows])    
            resultGrid.set('v.selectedRows', Array.from(preselectedRows))                    
        }
    },     
})
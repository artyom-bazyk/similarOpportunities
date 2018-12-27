({
	init : function(cmp, event, helper) {
        var allFieldsSet = new Set([cmp.get("v.field1"), cmp.get("v.field2"), cmp.get("v.field3"), cmp.get("v.field4"), cmp.get("v.field5")])
        allFieldsSet.delete('Name')
        var allFields = Array.from(allFieldsSet)
        cmp.set("v.allFields", allFields)	
        var jsonData = JSON.stringify({fields:allFields.join(','),
                                       recordId:cmp.get('v.recordId'),
                                       rowsToLoad:cmp.get("v.rowsToLoad"),
                                       rowsToSkip:0
                                      });        
		var action = cmp.get("c.initData")	        
		helper.loadData(cmp, helper, action, jsonData)    		   
	},
    
	handleRowAction : function(cmp, event, helper) {
        var row = event.getParam('row');     
        
		var action = cmp.get("c.deleteBookmark")
        action.setParams({fromId : cmp.get('v.recordId'),
                          toId: row.Id
                         });
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                var records = cmp.get("v.records")
                var rowIndex = records.findIndex(function(element) {
                  return element.Id === row.Id;
                })
                records.splice(rowIndex, 1);
                cmp.set("v.records", records)
                var totalNumberOfRows = cmp.get('v.totalNumberOfRows')
                cmp.set('v.totalNumberOfRows', totalNumberOfRows - 1)    
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
    
	hanldeFindButton : function(cmp, event, helper) {
        var navService = cmp.find("navService");
        var pageReference = {    
            type: 'standard__component',
            attributes: {
                componentName: 'c__similarOpportunitySearch'   
            },    
            state: {
                id: cmp.get('v.recordId'),
                allFields: JSON.stringify(cmp.get('v.allFields'))
            }
        }  
		event.preventDefault();
        navService.navigate(pageReference);        
    },
    
	handleShowMore : function(cmp, event, helper) {
        var allFields = cmp.get("v.allFields")
        var records = cmp.get("v.records")
        var jsonData = JSON.stringify({fields:allFields.join(','),
                                       recordId:cmp.get('v.recordId'),
                                       rowsToLoad:cmp.get("v.rowsToLoad"),
                                       rowsToSkip:records.length
                                      });        
		var action = cmp.get("c.loadMoreData")	        
		helper.loadData(cmp, helper, action, jsonData)        
    },    
})
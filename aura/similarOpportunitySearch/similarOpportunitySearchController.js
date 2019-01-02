({
    init : function(cmp, event, helper) {
		var pageReference = cmp.get("v.pageReference");
        var opportunity = cmp.get("v.opportunity");
        opportunity.Id = pageReference.state.id;                
        var action = cmp.get("c.initData")
        var allFields = JSON.parse(pageReference.state.allFields)
        cmp.set("v.allFields", allFields)
        var selectedFields = [...allFields];
        cmp.set("v.selectedFields", selectedFields)
        var opportunity = cmp.get("v.opportunity")
        var jsonData = JSON.stringify({allFields:allFields.join(','),
                                       recordId:opportunity.Id,
                                       lastNMonths:cmp.get("v.lastNMonths")
                                      });
        action.setParams({jsonData : jsonData});
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                var jsonData = JSON.parse(response.getReturnValue())
                cmp.set('v.fieldDescriptionList', jsonData.fieldDescriptionList)
                cmp.set('v.opportunity', jsonData.opportunity)   
                var similarOpportunityResults = cmp.find('similarOpportunityResults')
                similarOpportunityResults.init()
                
            }else if (state === "ERROR") {
                helper.handleErrorResponse(response)
            }
        });
        
        $A.enqueueAction(action);           
    },
    
    handleRefreshView : function(cmp, event, helper) {
		$A.get('e.force:refreshView').fire();        
    },
   
})
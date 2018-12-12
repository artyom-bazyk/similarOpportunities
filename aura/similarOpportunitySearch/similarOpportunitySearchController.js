({
    init : function(cmp, event, helper) {
        var action = cmp.get("c.initData")
        var allFields = [cmp.get("v.field1"), cmp.get("v.field2"), cmp.get("v.field3"), cmp.get("v.field4"), cmp.get("v.field5")]
        cmp.set("v.allFields", allFields)
        var selectedFields = JSON.parse(JSON.stringify( allFields ));
        cmp.set("v.selectedFields", selectedFields)
        var opportunity = cmp.get("v.opportunity")
        var rowsToLoad = cmp.get("v.rowsToLoad")
        var jsonData = JSON.stringify({fields:allFields.join(','),
                                       recordId:opportunity.Id,
                                       lastNMonths:cmp.get("v.lastNMonths"),
                                       rowsToLoad:rowsToLoad
                                      });
        action.setParams({jsonData : jsonData});
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                var jsonData = JSON.parse(response.getReturnValue())
                var records = jsonData.records
                helper.processRecords(helper, records)               
                //cmp.set('v.records', records)
                cmp.set('v.nodes', jsonData.nodes)
                cmp.set('v.opportunity', jsonData.opportunity)    
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
    
   
})
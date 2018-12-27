({
    onCriteriaClick : function(cmp, event, helper) {	        
        var nodes = cmp.get("v.nodes")
        var selectedFields = []
        var allFields = []
        var criteriaCheckboxes = cmp.find('criteria')
        for(var i = 0; i < criteriaCheckboxes.length; i++){
            if(criteriaCheckboxes[i].get("v.checked")){
                selectedFields.push(criteriaCheckboxes[i].get("v.value"))
            }
            allFields.push(criteriaCheckboxes[i].get("v.value"))            
        }
        selectedFields = selectedFields.length > 0 ? selectedFields : allFields
        var criteriaChangedEvent = $A.get("e.c:similarOpportunityCriteriaChanged")
        criteriaChangedEvent.setParams({selectedFields : selectedFields,
                                        allFields:allFields,
                                        selectedMonth:parseInt(cmp.get("v.selectedMonth"))
                                       })
        criteriaChangedEvent.fire()
    }
})
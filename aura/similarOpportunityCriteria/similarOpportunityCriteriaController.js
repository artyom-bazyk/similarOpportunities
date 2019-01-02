({
    onCriteriaClick : function(cmp, event, helper) {	        
        var selectedFields = []
        var allFields = []
        var criteriaCheckboxes = cmp.find('criteria')
        for(var i = 1; i < criteriaCheckboxes.length; i++){
            if(criteriaCheckboxes[i].get("v.checked")){
                selectedFields.push(criteriaCheckboxes[i].get("v.value"))
            }
            allFields.push(criteriaCheckboxes[i].get("v.value"))            
        }
        var isStrictMode = selectedFields.length > 0
        selectedFields = selectedFields.length > 0 ? selectedFields : allFields
        
        var criteriaChangedEvent = $A.get("e.c:similarOpportunityCriteriaChanged")
        criteriaChangedEvent.setParams({selectedFields : selectedFields,
                                        isStrictMode:isStrictMode,
                                        selectedMonth:parseInt(cmp.get("v.selectedMonth"))
                                       })

        criteriaChangedEvent.fire()
    }
})
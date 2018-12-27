({
    fetchData: function(cmp, helper){
        return new Promise($A.getCallback(function(resolve, reject) {
            var selectedFields = cmp.get("v.selectedFields")
            var allFields = cmp.get("v.allFields")
            var selectedMonth = cmp.get("v.selectedMonth")
            var action = cmp.get("c.findSimilarOpportunities")
            var opportunity = cmp.get("v.opportunity")
            var rowsToLoad = cmp.get("v.rowsToLoad")
        	var isStrictMode = allFields.length != selectedFields.length            
            
            var jsonData = JSON.stringify({
                opportunity:opportunity, 
                fields:allFields.join(','),
                selectedFields:selectedFields.join(','),
                lastNMonths:selectedMonth,
                rowsToLoad:rowsToLoad,
                rowsToSkip:cmp.get('v.records').length,
                isStrictMode: isStrictMode                
            });
            action.setParams({jsonData : jsonData});        
            action.setCallback(this, function(response) {
                var state = response.getState();
                if (state === "SUCCESS") {
                    var jsonData = JSON.parse(response.getReturnValue())
                    helper.processRecords(cmp, helper, jsonData.records, jsonData.bookmarkedRecords)               
                    //cmp.set('v.totalNumberOfRows', jsonData.totalNumberOfRows)
                    //cmp.set('v.enableInfiniteLoading', true);          
                    resolve(jsonData.records);  
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
            
        }));
        
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
		var maxRelevancyScore = cmp.get('v.nodes').length       
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
    
    findSimilarOpportunities : function(cmp, helper, jsonData) {   
        var action = cmp.get("c.findSimilarOpportunities")
        action.setParams({jsonData : jsonData});        
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                var jsonData = JSON.parse(response.getReturnValue())
                helper.processRecords(cmp, helper, jsonData.records, jsonData.bookmarkedRecords)               
                cmp.set('v.records', jsonData.records)
                cmp.set('v.totalNumberOfRows', jsonData.totalNumberOfRows)
                cmp.set('v.enableInfiniteLoading', true);                
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
    
    navigateToOpportunity : function(cmp, helper, recordId) {   
        var navEvt = $A.get("e.force:navigateToSObject");
        navEvt.setParams({
            recordId: recordId
        });
        navEvt.fire();      
    },     
})
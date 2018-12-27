public class SimilarOpptyRelatedListController {

    @AuraEnabled
    public static String initData(String jsonData){
        Map<String, Object> requestMap = (Map<String, Object>)JSON.deserializeUntyped(jsonData);          
        system.debug(requestMap);
        Map<String, Object> responseMap = new Map<String, Object>(); 
        List<String> fields = ((String)requestMap.get('fields')).split(',');
        
        Set<String> fieldsForSelect = new Set<String>(fields);
        Set<String> fieldsForWhere = new Set<String>(fields);
        fieldsForSelect.addAll(SimilarOpportunitySearchController.getLookupNames(fieldsForSelect));
        fieldsForSelect.add('Name');
        Id oppId = (Id)requestMap.get('recordId');
        Integer rowsToLoad = (Integer)requestMap.get('rowsToLoad');
        system.debug(fieldsForSelect);
        Integer totalNumberOfRows = getBookmarkedOpportunitiesAmount(oppId);
        responseMap.put('totalNumberOfRows', totalNumberOfRows);
        responseMap.put('fieldDescriptionList', getFieldsDescriptionList(fields));
        responseMap.put('records', (List<Opportunity>)getBookmarkedOpportunities(oppId, fieldsForSelect, rowsToLoad, 0));
        return JSON.serialize(responseMap);       
    }    

    @AuraEnabled
    public static String loadMoreData(String jsonData){
        Map<String, Object> requestMap = (Map<String, Object>)JSON.deserializeUntyped(jsonData);          
        system.debug(requestMap);
        Map<String, Object> responseMap = new Map<String, Object>(); 
        List<String> fields = ((String)requestMap.get('fields')).split(',');
        
        Set<String> fieldsForSelect = new Set<String>(fields);
        Set<String> fieldsForWhere = new Set<String>(fields);
        fieldsForSelect.addAll(SimilarOpportunitySearchController.getLookupNames(fieldsForSelect));
        fieldsForSelect.add('Name');
        Id oppId = (Id)requestMap.get('recordId');
        Integer rowsToLoad = (Integer)requestMap.get('rowsToLoad');
        Integer rowsToSkip = (Integer)requestMap.get('rowsToSkip');
        system.debug(fieldsForSelect);
        Integer totalNumberOfRows = getBookmarkedOpportunitiesAmount(oppId);
        responseMap.put('totalNumberOfRows', totalNumberOfRows);
        responseMap.put('records', (List<Opportunity>)getBookmarkedOpportunities(oppId, fieldsForSelect, rowsToLoad, rowsToSkip));
        return JSON.serialize(responseMap);       
    }    
    
    @AuraEnabled    
    public static void deleteBookmark(String fromId, String toId){
        delete [Select Id From Bookmark Where FromId = :fromId AND ToId = :toId];
    }  
    
    public static List<Opportunity> getBookmarkedOpportunities(Id oppId, Set<String> fieldsForSelect, Integer rowsToLoad, Integer rowsToSkip){
        List<Bookmark> bookmarkedOppties = [Select Id, FromId, ToId From Bookmark Where FromId =:oppId And IsDeleted = false LIMIT :rowsToLoad OFFSET :rowsToSkip];
        List<Id> oppIds = new List<Id>();
        for(Bookmark bookmark : bookmarkedOppties){
            oppIds.add(bookmark.ToId);
        }
        String query = 'SELECT '+String.join(new List<String>(fieldsForSelect),',')+' FROM Opportunity WHERE Id IN :oppIds ';
		return Database.query(String.escapeSingleQuotes(query));
    }     
    
    public static Integer getBookmarkedOpportunitiesAmount(Id oppId){
        List<AggregateResult> aggrResult = [Select count(Id) From Bookmark Where FromId =:oppId And IsDeleted = false];
    	return (Integer)aggrResult.get(0).get('expr0');
    }        
    
    public static List<FieldDescription> getFieldsDescriptionList(List<String> fields){       
        List<FieldDescription> nodes = new List<FieldDescription>();
        Map<String, Schema.SObjectField> fieldMap = Opportunity.SObjectType.getDescribe().fields.getMap();
        for (String fieldName: fields){
            FieldDescription node = new FieldDescription();
            Schema.DescribeFieldResult descField = fieldMap.get(fieldName).getDescribe();
            node.label = descField.getLabel();
            node.apiName = descField.getName();
            node.type = descField.getType().name();
            System.debug('node ' +node);
            if(descField.getType() == Schema.DisplayType.REFERENCE){
                Map<String, Schema.SObjectField> parentFieldMap = descField.getReferenceTo().get(0).getDescribe().fields.getMap();
                for (String parentFieldName: parentFieldMap.keySet()){
                    Schema.DescribeFieldResult parentDescField = parentFieldMap.get(parentFieldName).getDescribe();
                    if(parentDescField.isAutoNumber() || parentDescField.isNameField()){
		            	node.apiRelationshipName = descField.getRelationshipName();
                        node.apiNameOnParent = parentDescField.getName();
                        break;
                    }
                }
            }
            nodes.add(node);
        }
        
        return nodes;
    }    
    
    public class FieldDescription{
        String label;
        String apiName;
        String apiRelationshipName;
        String apiNameOnParent;
        String type;
    }    
}
public class SimilarOpportunitySearchController {
    public static final String OR_CLAUSE = 'OR';
    public static final String AND_CLAUSE = 'AND';
    public static final String YYYMMDD_FORMAT = 'yyy-MM-dd';
    public static final Integer CLOSE_DATE_RANGE = 3;
    public static final Integer ROWS_TO_LOAD = 300;
    
    @AuraEnabled
    public static String initData(String jsonData){
        Map<String, Object> requestMap = (Map<String, Object>)JSON.deserializeUntyped(jsonData);          
        system.debug(requestMap);
        system.debug(requestMap.get('fields'));
        Map<String, Object> responseMap = new Map<String, Object>(); 
        List<String> fields = ((String)requestMap.get('fields')).split(',');
        
        Set<String> fieldsForSelect = new Set<String>(fields);
        Set<String> fieldsForWhere = new Set<String>(fields);
        fieldsForSelect.addAll(getLookupNames(fieldsForSelect));
        fieldsForSelect.add('Name');
        Id oppId = (Id)requestMap.get('recordId');
        Integer lastNMonths = (Integer)requestMap.get('lastNMonths');
        system.debug(fieldsForSelect);
        Opportunity opp = (Opportunity)Database.query('SELECT '+String.join(new List<String>(fieldsForSelect),',')+' FROM Opportunity WHERE Id=:oppId').get(0);
        Integer totalNumberOfRows = getSimilarOpportunitiesAmount(opp, lastNMonths, fieldsForWhere, false);
        responseMap.put('totalNumberOfRows', totalNumberOfRows);
        List<Opportunity> records = findSimilarOpportunities(opp, lastNMonths, fieldsForSelect, fieldsForWhere, false);
        responseMap.put('records', records);
        responseMap.put('bookmarkedRecords', getBookmarkedOpportunities(oppId, records));
        responseMap.put('opportunity', opp);
        responseMap.put('nodes', getCriteria(new List<String>(fieldsForWhere), opp));
        return JSON.serialize(responseMap);       
    }
    
    public static List<Sobject> findSimilarOpportunities(Opportunity opp, Integer lastNMonths, Set<String> fieldsForSelect, 
                                                         Set<String> fieldsForWhere, Boolean isStrictMode){
		String query = getSimilarOpportunitiesQuery(opp, lastNMonths, fieldsForSelect, fieldsForWhere, isStrictMode);
        query += ' ORDER BY Name LIMIT :ROWS_TO_LOAD ';
        System.debug(query);
        return Database.query(query);
	}
    
    public static Integer getSimilarOpportunitiesAmount(Opportunity opp, Integer lastNMonths, Set<String> fieldsForWhere, Boolean isStrictMode){
        String query = getSimilarOpportunitiesQuery(opp, lastNMonths, new Set<String>{'count(Id)'}, fieldsForWhere, isStrictMode);
        System.debug(query);
        List<AggregateResult> aggrResult = Database.query(query);
        return (Integer)aggrResult.get(0).get('expr0');
    }    
    
    public static List<Id> getBookmarkedOpportunities(Id oppId, List<Opportunity> optyList){
        List<Bookmark> bookmarkedOppties = [Select Id, FromId, ToId From Bookmark Where FromId =:oppId And ToId IN :optyList And IsDeleted = false];
        List<Id> oppIds = new List<Id>();
        for(Bookmark bookmark : bookmarkedOppties){
            oppIds.add(bookmark.ToId);
        }    
        return oppIds;
    }    
    
    @AuraEnabled    
    public static void bookmarkOpportunities(String jsonData){
        Map<String, Object> requestMap = (Map<String, Object>)JSON.deserializeUntyped(jsonData); 
        String opportunityIdsJson = JSON.serialize(requestMap.get('opportunityIds'));
        List<Id> opportunityIds = (List<Id>)JSON.deserialize(opportunityIdsJson, List<Id>.class);
        
        //List<Id> opportunityIds = (List<Id>)requestMap.get('opportunityIds');
        System.debug(opportunityIds);
        Id recordId = (Id)requestMap.get('recordId');        
        List<Bookmark> bookmarkList = new List<Bookmark>();
        for(Id oppId : opportunityIds){
            Bookmark bookmark = new Bookmark(
                FromId = recordId,
                ToId = oppId
            );            
            bookmarkList.add(bookmark);
        }
        insert bookmarkList;
        
    }       
    
    public static String getSimilarOpportunitiesQuery(Opportunity opp, Integer lastNMonths, Set<String> fieldsForSelect, Set<String> fieldsForWhere, Boolean isStrictMode){
        Date lowerRange = System.today().addMonths(-lastNMonths);
        String lowerRangeFormatted = Datetime.newInstance(lowerRange.year(), lowerRange.month(), lowerRange.day()).format(YYYMMDD_FORMAT); 
        Date upperRange = System.today().addMonths(-(lastNMonths - CLOSE_DATE_RANGE));
        String upperRangeFormatted = Datetime.newInstance(upperRange.year(), upperRange.month(), upperRange.day()).format(YYYMMDD_FORMAT); 
        
        String query = 'SELECT '+String.join(new List<String>(fieldsForSelect),',')+' FROM Opportunity WHERE Id != \''+opp.Id+'\' AND StageName = \'Closed Won\' AND CloseDate >= ' +lowerRangeFormatted +' AND CloseDate <= '+upperRangeFormatted +' AND (';
        Map<String, Schema.SObjectField> fieldMap = Opportunity.SObjectType.getDescribe().fields.getMap();
                System.debug(fieldsForWhere);
        String clause = isStrictMode ? AND_CLAUSE : OR_CLAUSE;
        for(String field : fieldsForWhere){
            Schema.DescribeFieldResult descField = fieldMap.get(field).getDescribe();
            if(opp.get(field) != null){
                system.debug(descField.getType());
                if(descField.getType() == Schema.DisplayType.DATE){
                    Date d = (Date)opp.get(field);
                    String dateFormatted = Datetime.newInstance(d.year(), d.month(), d.day()).format('yyy-MM-dd');                  
                    query += ' ' +field + ' = ' + dateFormatted + ' ' + clause;                                    
                }else if(descField.getType() == Schema.DisplayType.BOOLEAN
                         || descField.getType() == Schema.DisplayType.PERCENT
                         || descField.getType() == Schema.DisplayType.CURRENCY){
                             query += ' ' +field + ' = ' + opp.get(field) + ' ' + clause;                                    
                         }else{
                             query += ' ' +field + ' = \'' + opp.get(field) + '\' ' + clause;                                    
                         }
            }
        }
        query = query.removeEnd(clause) + ')  ';
        return query;
    }    
    
    @AuraEnabled
    public static String findSimilarOpportunities(String jsonData){
        Map<String, Object> requestMap = (Map<String, Object>)JSON.deserializeUntyped(jsonData);       
        system.debug(requestMap);        
        Map<String, Object> responseMap = new Map<String, Object>(); 
        List<String> fields = ((String)requestMap.get('fields')).split(',');
        List<String> selectedFields = ((String)requestMap.get('selectedFields')).split(',');
        Set<String> fieldsForSelect = new Set<String>(fields);
        fieldsForSelect.addAll(getLookupNames(fieldsForSelect));        
        fieldsForSelect.add('Name');      
        Set<String> fieldsForWhere = new Set<String>(selectedFields);              
        String oppJson = JSON.serialize(requestMap.get('opportunity'));
        Opportunity opp = (Opportunity)JSON.deserialize(oppJson, Opportunity.class);
        Integer lastNMonths = (Integer)requestMap.get('lastNMonths');
        Boolean isStrictMode = (Boolean)requestMap.get('isStrictMode');
        Integer totalNumberOfRows = getSimilarOpportunitiesAmount(opp, lastNMonths, fieldsForWhere, isStrictMode);
        responseMap.put('totalNumberOfRows', totalNumberOfRows);        
        List<Opportunity> records = findSimilarOpportunities(opp, lastNMonths, fieldsForSelect, fieldsForWhere, isStrictMode);
        responseMap.put('records', records);
        responseMap.put('bookmarkedRecords', getBookmarkedOpportunities(opp.Id, records));        
        return JSON.serialize(responseMap);            
    }
    
    @AuraEnabled
    public static List<CriteriaNode> getCriteria(List<String> fields, Opportunity opp){       
        List<CriteriaNode> nodes = new List<CriteriaNode>();
        Map<String, Schema.SObjectField> fieldMap = Opportunity.SObjectType.getDescribe().fields.getMap();
        for (String fieldName: fields){
            CriteriaNode node = new CriteriaNode();
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
                        Sobject parent = opp.getSobject(descField.getRelationshipName());
                        node.value = parent == null ? null : (String)parent.get(parentDescField.getName());
                        node.apiRelationshipName = descField.getRelationshipName();
                        node.apiNameOnParent = parentDescField.getName();
                        break;
                    }
                }
            }else{
                node.value =  opp.get(fieldName);                
            }
            nodes.add(node);                
        }
        System.debug('nodes ' +nodes);
        
        return nodes;
    }
    
    public static List<String> getLookupNames(Set<String> fields){
        List<String> lookupFields = new List<String>();
        Map<String, Schema.SObjectField> fieldMap = Opportunity.SObjectType.getDescribe().fields.getMap();
        for(String field : fields){
            Schema.DescribeFieldResult descField = fieldMap.get(field).getDescribe();
            if( descField.getType() == Schema.DisplayType.REFERENCE){
                Map<String, Schema.SObjectField> parentFieldMap = descField.getReferenceTo().get(0).getDescribe().fields.getMap();
                for (String parentFieldName: parentFieldMap.keySet()){
                    Schema.DescribeFieldResult parentDescField = parentFieldMap.get(parentFieldName).getDescribe();
                    if(parentDescField.isAutoNumber() || parentDescField.isNameField()){
                        lookupFields.add(descField.getRelationshipName()+ '.' + parentDescField.getName());                    
                        break;
                    }
                }            
            }
        }        
        return lookupFields;
    }
    
    public class CriteriaNode{
        String label;
        Object value;
        String apiName;
        String apiRelationshipName;
        String apiNameOnParent;
        String coincidence;
        String type;
    }
}
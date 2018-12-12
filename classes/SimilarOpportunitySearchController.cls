public class SimilarOpportunitySearchController {
    public static final String OR_CLAUSE = 'OR';
    
    @AuraEnabled
    public static String initData(String jsonData){
        Map<String, Object> requestMap = (Map<String, Object>)JSON.deserializeUntyped(jsonData);          
        system.debug(requestMap);
        Map<String, Object> responseMap = new Map<String, Object>(); 
        List<String> fields = ((String)requestMap.get('fields')).split(',');
        
        Set<String> fieldsForSelect = new Set<String>(fields);
        Set<String> fieldsForWhere = new Set<String>(fields);
        fieldsForSelect.addAll(getLookupNames(fieldsForSelect));
        fieldsForSelect.add('Name');
        fieldsForSelect.add('Similar_Opportunity__c');
        Id oppId = (Id)requestMap.get('recordId');
        Integer lastNMonths = (Integer)requestMap.get('lastNMonths');
        Integer rowsToLoad = (Integer)requestMap.get('rowsToLoad');
        system.debug(fieldsForSelect);
        Opportunity opp = (Opportunity)Database.query('SELECT '+String.join(new List<String>(fieldsForSelect),',')+' FROM Opportunity WHERE Id=:oppId').get(0);
        Integer totalNumberOfRows = getSimilarOpportunitiesAmount(opp, lastNMonths, fieldsForWhere);
        responseMap.put('totalNumberOfRows', totalNumberOfRows);
        responseMap.put('records', (List<Opportunity>)findSimilarOpportunities(opp, lastNMonths, fieldsForSelect, fieldsForWhere, rowsToLoad, 0));
        responseMap.put('opportunity', opp);
        responseMap.put('nodes', getCriteria(new List<String>(fieldsForWhere), opp));
        return JSON.serialize(responseMap);       
    }
    
    public static List<Sobject> findSimilarOpportunities(Opportunity opp, Integer lastNMonths, Set<String> fieldsForSelect, 
                                                         Set<String> fieldsForWhere, Integer rowsToLoad, Integer rowsToSkip){
        String query = getSimilarOpportunitiesQuery(opp, lastNMonths, fieldsForSelect, fieldsForWhere);
        query += ' ORDER BY Name LIMIT :rowsToLoad OFFSET :rowsToSkip ';
        System.debug(query);
    	return Database.query(query);
    }
    
    public static Integer getSimilarOpportunitiesAmount(Opportunity opp, Integer lastNMonths, Set<String> fieldsForWhere){
        String query = getSimilarOpportunitiesQuery(opp, lastNMonths, new Set<String>{'count(Id)'}, fieldsForWhere);
        System.debug(query);
        List<AggregateResult> aggrResult = Database.query(query);
    	return (Integer)aggrResult.get(0).get('expr0');
    }    
    
    @AuraEnabled    
    public static void bookmarkOpportunities(String jsonData){
        Map<String, Object> requestMap = (Map<String, Object>)JSON.deserializeUntyped(jsonData); 
        String opportunityIdsJson = JSON.serialize(requestMap.get('opportunityIds'));
        List<Id> opportunityIds = (List<Id>)JSON.deserialize(opportunityIdsJson, List<Id>.class);
        
        //List<Id> opportunityIds = (List<Id>)requestMap.get('opportunityIds');
        System.debug(opportunityIds);
        Id recordId = (Id)requestMap.get('recordId');        
        List<Opportunity> oppList = new List<Opportunity>();
        for(Id oppId : opportunityIds){
            Opportunity opp = new Opportunity(
                Id = oppId,
                Similar_Opportunity__c = recordId
            );
            oppList.add(opp);
        }
        update oppList;
        
    } 
    
    public static String getSimilarOpportunitiesQuery(Opportunity opp, Integer lastNMonths, Set<String> fieldsForSelect, Set<String> fieldsForWhere){
        String query = 'SELECT '+String.join(new List<String>(fieldsForSelect),',')+' FROM Opportunity WHERE Id != \''+opp.Id+'\' AND StageName = \'Closed Won\' AND CloseDate = LAST_N_MONTHS:'+lastNMonths+' AND (';
        Map<String, Schema.SObjectField> fieldMap = Opportunity.SObjectType.getDescribe().fields.getMap();
        for(String field : fieldsForWhere){
            Schema.DescribeFieldResult descField = fieldMap.get(field).getDescribe();
            if(opp.get(field) != null){
                system.debug(descField.getType());
                if(descField.getType() == Schema.DisplayType.DATE){
                    Date d = (Date)opp.get(field);
                    String dateFormatted = Datetime.newInstance(d.year(), d.month(), d.day()).format('yyy-MM-dd');                  
		            query += ' ' +field + ' = ' + dateFormatted + ' ' + OR_CLAUSE;                                    
                }else if(descField.getType() == Schema.DisplayType.BOOLEAN
                         || descField.getType() == Schema.DisplayType.PERCENT
                         || descField.getType() == Schema.DisplayType.CURRENCY){
		            query += ' ' +field + ' = ' + opp.get(field) + ' ' + OR_CLAUSE;                                    
                }else{
		            query += ' ' +field + ' = \'' + opp.get(field) + '\' ' + OR_CLAUSE;                                    
                }
            }
        }
        query = query.removeEnd(OR_CLAUSE) + ')  ';
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
        fieldsForSelect.add('Similar_Opportunity__c');        
        Set<String> fieldsForWhere = new Set<String>(selectedFields);              
        String oppJson = JSON.serialize(requestMap.get('opportunity'));
        Opportunity opp = (Opportunity)JSON.deserialize(oppJson, Opportunity.class);
        Integer lastNMonths = (Integer)requestMap.get('lastNMonths');
        Integer rowsToLoad = (Integer)requestMap.get('rowsToLoad');
        Integer rowsToSkip = (Integer)requestMap.get('rowsToSkip');
        Integer totalNumberOfRows = getSimilarOpportunitiesAmount(opp, lastNMonths, fieldsForWhere);
        responseMap.put('totalNumberOfRows', totalNumberOfRows);        
        responseMap.put('records', findSimilarOpportunities(opp, lastNMonths, fieldsForSelect, fieldsForWhere, rowsToLoad, rowsToSkip));
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
		            	node.value = parent == null ? '' : (String)parent.get(parentDescField.getName());
		            	node.apiRelationshipName = descField.getRelationshipName();
                        node.apiNameOnParent = parentDescField.getName();
                        break;
                    }
                }
            }else{
            	node.value = opp.get(fieldName) == null ? '' : opp.get(fieldName);                
            }
            nodes.add(node);
        }
        
        return nodes;
    }
    
    private static List<String> getLookupNames(Set<String> fields){
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
        System.debug(lookupFields);
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
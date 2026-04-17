

# Class: TimeFilter 


_Constraints on the visible time window_





URI: [debrief:class/TimeFilter](https://debrief.info/schemas/class/TimeFilter)






```mermaid
 classDiagram
    class TimeFilter
    click TimeFilter href "../../classes/TimeFilter/"
      TimeFilter : end
        
          
    
        
        
        TimeFilter --> "0..1" TimeInstant : end
        click TimeInstant href "../../classes/TimeInstant/"
    

        
      TimeFilter : start
        
          
    
        
        
        TimeFilter --> "0..1" TimeInstant : start
        click TimeInstant href "../../classes/TimeInstant/"
    

        
      
```




<!-- no inheritance hierarchy -->


## Slots

| Name | Cardinality and Range | Description | Inheritance |
| ---  | --- | --- | --- |
| [start](../slots/start.md) | 0..1 <br/> [TimeInstant](../classes/TimeInstant.md) | Filter start (null = unbounded) | direct |
| [end](../slots/end.md) | 0..1 <br/> [TimeInstant](../classes/TimeInstant.md) | Filter end (null = unbounded) | direct |





## Usages

| used by | used in | type | used |
| ---  | --- | --- | --- |
| [TemporalSlice](../classes/TemporalSlice.md) | [timeFilter](../slots/timeFilter.md) | range | [TimeFilter](../classes/TimeFilter.md) |








## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:TimeFilter |
| native | debrief:TimeFilter |






## LinkML Source

<!-- TODO: investigate https://stackoverflow.com/questions/37606292/how-to-create-tabbed-code-blocks-in-mkdocs-or-sphinx -->

### Direct

<details>
```yaml
name: TimeFilter
description: Constraints on the visible time window
from_schema: https://debrief.info/schemas/debrief
attributes:
  start:
    name: start
    description: Filter start (null = unbounded)
    from_schema: https://debrief.info/schemas/session-state
    domain_of:
    - PlotTimeExtent
    - TimeRange
    - TimeFilter
    range: TimeInstant
  end:
    name: end
    description: Filter end (null = unbounded)
    from_schema: https://debrief.info/schemas/session-state
    domain_of:
    - PlotTimeExtent
    - TimeRange
    - TimeFilter
    range: TimeInstant

```
</details>

### Induced

<details>
```yaml
name: TimeFilter
description: Constraints on the visible time window
from_schema: https://debrief.info/schemas/debrief
attributes:
  start:
    name: start
    description: Filter start (null = unbounded)
    from_schema: https://debrief.info/schemas/session-state
    alias: start
    owner: TimeFilter
    domain_of:
    - PlotTimeExtent
    - TimeRange
    - TimeFilter
    range: TimeInstant
  end:
    name: end
    description: Filter end (null = unbounded)
    from_schema: https://debrief.info/schemas/session-state
    alias: end
    owner: TimeFilter
    domain_of:
    - PlotTimeExtent
    - TimeRange
    - TimeFilter
    range: TimeInstant

```
</details>
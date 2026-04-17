

# Class: StacExtensionProperties 


_Extension properties added to STAC item.properties under the debrief: namespace. All properties are optional — existing items without extension properties remain valid. These properties enable filtering, searching, and colour-coding in the Discovery UI._

__





URI: [debrief:class/StacExtensionProperties](https://debrief.info/schemas/class/StacExtensionProperties)






```mermaid
 classDiagram
    class StacExtensionProperties
    click StacExtensionProperties href "../../classes/StacExtensionProperties/"
      StacExtensionProperties : feature_tags
        
      StacExtensionProperties : platforms
        
          
    
        
        
        StacExtensionProperties --> "*" PlatformRecord : platforms
        click PlatformRecord href "../../classes/PlatformRecord/"
    

        
      StacExtensionProperties : tags
        
      
```




<!-- no inheritance hierarchy -->


## Slots

| Name | Cardinality and Range | Description | Inheritance |
| ---  | --- | --- | --- |
| [platforms](../slots/platforms.md) | * <br/> [PlatformRecord](../classes/PlatformRecord.md) | Fully-resolved per-platform metadata array | direct |
| [tags](../slots/tags.md) | * <br/> [String](../types/String.md) | Plot-level tags — free-text labels applied to the entire plot by the analyst | direct |
| [feature_tags](../slots/feature_tags.md) | * <br/> [String](../types/String.md) | Union of all feature-level tags from the plot's GeoJSON features | direct |











## Identifier and Mapping Information






### Schema Source


* from schema: https://debrief.info/schemas/debrief




## Mappings

| Mapping Type | Mapped Value |
| ---  | ---  |
| self | debrief:StacExtensionProperties |
| native | debrief:StacExtensionProperties |






## LinkML Source

<!-- TODO: investigate https://stackoverflow.com/questions/37606292/how-to-create-tabbed-code-blocks-in-mkdocs-or-sphinx -->

### Direct

<details>
```yaml
name: StacExtensionProperties
description: 'Extension properties added to STAC item.properties under the debrief:
  namespace. All properties are optional — existing items without extension properties
  remain valid. These properties enable filtering, searching, and colour-coding in
  the Discovery UI.

  '
from_schema: https://debrief.info/schemas/debrief
attributes:
  platforms:
    name: platforms
    description: 'Fully-resolved per-platform metadata array. Each entry represents
      one platform in the plot with merged registry + override data.

      '
    from_schema: https://debrief.info/schemas/stac-extension
    rank: 1000
    slot_uri: debrief:platforms
    domain_of:
    - StacExtensionProperties
    - StacItemSummary
    range: PlatformRecord
    required: false
    multivalued: true
    inlined: true
    inlined_as_list: true
  tags:
    name: tags
    description: 'Plot-level tags — free-text labels applied to the entire plot by
      the analyst. Trimmed non-empty strings with no duplicates.

      '
    from_schema: https://debrief.info/schemas/stac-extension
    slot_uri: debrief:tags
    domain_of:
    - BaseFeatureProperties
    - StacExtensionProperties
    - StacItemSummary
    range: string
    required: false
    multivalued: true
  feature_tags:
    name: feature_tags
    description: 'Union of all feature-level tags from the plot''s GeoJSON features.
      Aggregated at item level for discoverability. Authoritative per-feature tags
      remain in each GeoJSON feature''s properties.

      '
    from_schema: https://debrief.info/schemas/stac-extension
    rank: 1000
    slot_uri: debrief:feature_tags
    domain_of:
    - StacExtensionProperties
    - StacItemSummary
    range: string
    required: false
    multivalued: true

```
</details>

### Induced

<details>
```yaml
name: StacExtensionProperties
description: 'Extension properties added to STAC item.properties under the debrief:
  namespace. All properties are optional — existing items without extension properties
  remain valid. These properties enable filtering, searching, and colour-coding in
  the Discovery UI.

  '
from_schema: https://debrief.info/schemas/debrief
attributes:
  platforms:
    name: platforms
    description: 'Fully-resolved per-platform metadata array. Each entry represents
      one platform in the plot with merged registry + override data.

      '
    from_schema: https://debrief.info/schemas/stac-extension
    rank: 1000
    slot_uri: debrief:platforms
    alias: platforms
    owner: StacExtensionProperties
    domain_of:
    - StacExtensionProperties
    - StacItemSummary
    range: PlatformRecord
    required: false
    multivalued: true
    inlined: true
    inlined_as_list: true
  tags:
    name: tags
    description: 'Plot-level tags — free-text labels applied to the entire plot by
      the analyst. Trimmed non-empty strings with no duplicates.

      '
    from_schema: https://debrief.info/schemas/stac-extension
    slot_uri: debrief:tags
    alias: tags
    owner: StacExtensionProperties
    domain_of:
    - BaseFeatureProperties
    - StacExtensionProperties
    - StacItemSummary
    range: string
    required: false
    multivalued: true
  feature_tags:
    name: feature_tags
    description: 'Union of all feature-level tags from the plot''s GeoJSON features.
      Aggregated at item level for discoverability. Authoritative per-feature tags
      remain in each GeoJSON feature''s properties.

      '
    from_schema: https://debrief.info/schemas/stac-extension
    rank: 1000
    slot_uri: debrief:feature_tags
    alias: feature_tags
    owner: StacExtensionProperties
    domain_of:
    - StacExtensionProperties
    - StacItemSummary
    range: string
    required: false
    multivalued: true

```
</details>
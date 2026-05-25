import { EntityCrudPage } from "@/components/data/EntityCrudPage";

type Props = {
  title: string;
  listEndpoint: string;
  entityKind: string;
  parentField?: { label: string; listEndpoint: string };
};

export function AssetTaxonomyPage({ title, listEndpoint, entityKind, parentField }: Props) {
  return (
    <EntityCrudPage
      title={title}
      listEndpoint={listEndpoint}
      entityKind={entityKind}
      parentField={parentField}
      columns={[{ key: "title", label: "ชื่อ" }, { key: "id", label: "ID" }]}
    />
  );
}

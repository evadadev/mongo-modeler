import { Coords, GUID, Size } from '@/core/model';
import { DatabaseSchemaVm, FieldVm, TableVm } from './canvas.vm';
import {
  DEFAULT_TABLE_WIDTH,
  HEADER_HEIGHT,
  ROW_HEIGHT,
} from './components/table/database-table.const';

export interface UpdateInfo {
  id: GUID;
  position: Coords;
  totalHeight: number;
}

export const calculateTablePosition = (
  schema: DatabaseSchemaVm,
  updateInfo: UpdateInfo,
  canvasSize: Size
): DatabaseSchemaVm => ({
  ...schema,
  tables: schema.tables.map(table => {
    if (table.id === updateInfo.id) {
      return {
        ...table,
        //TODO: DEFAULT_TABLE_WIDTH that's the width of the table and we will have to treat this in a separate case
        x: Math.max(
          0,
          Math.min(
            updateInfo.position.x,
            canvasSize.width - DEFAULT_TABLE_WIDTH
          )
        ),
        y: Math.max(
          0,
          Math.min(
            updateInfo.position.y,
            canvasSize.height - updateInfo.totalHeight
          )
        ),
      };
    }
    return table;
  }),
});

export const findField = (fields: FieldVm[], id: GUID): FieldVm | undefined => {
  for (const field of fields) {
    if (field.id === id) return field;
    if (field.children) {
      const found = findField(field.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

export const calculateRelationXCoordinateOrigin = (
  tableOrigin: TableVm,
  tableDestination: TableVm
): number =>
  tableOrigin.x < tableDestination.x
    ? tableOrigin.x + DEFAULT_TABLE_WIDTH
    : tableOrigin.x;

export const calculateRelationXCoordinateEnd = (
  tableOrigin: TableVm,
  tableDestination: TableVm
): number =>
  tableDestination.x < tableOrigin.x
    ? tableDestination.x + DEFAULT_TABLE_WIDTH
    : tableDestination.x;

export interface XRelationCoords {
  xOrigin: number;
  xDestination: number;
}

export const calculateRelationXCoordinate = (
  tableOrigin: TableVm,
  tableDestination: TableVm
): XRelationCoords => ({
  xOrigin: calculateRelationXCoordinateOrigin(tableOrigin, tableDestination),
  xDestination: calculateRelationXCoordinateEnd(tableOrigin, tableDestination),
});

export interface SeekResult {
  found: boolean;
  parentCollapsed: boolean;
  YPosition: number;
}

const buildFieldFoundResponse = (
  parentCollapsed: boolean,
  YPosition: number
) => ({
  found: true,
  parentCollapsed,
  YPosition,
});

const doesFieldContainsChildren = (field: FieldVm) =>
  field.type === 'object' && field.children && field.children.length > 0;

const addFieldRowHeight = (
  YPosition: number,
  parentCollapsed: boolean
): number => (!parentCollapsed ? YPosition + ROW_HEIGHT : YPosition);

const isParentCollapsedOrCurrentNodeCollapsed = (
  parentCollapsed: boolean,
  field: FieldVm
) => (!parentCollapsed && field.isCollapsed ? true : parentCollapsed);

const seekField = (
  fieldId: GUID,
  seekResult: SeekResult,
  fields: FieldVm[]
): SeekResult => {
  const { found, parentCollapsed } = seekResult;
  let { YPosition } = seekResult;

  // When we hop into a nested object, we need to inform if the node owner is collapsed
  let childParentCollapsed = false;

  for (let i = 0; i < fields.length && !found; i++) {
    const field = fields[i];

    if (field.id === fieldId) {
      return buildFieldFoundResponse(parentCollapsed, YPosition);
    } else {
      YPosition = addFieldRowHeight(YPosition, parentCollapsed);

      childParentCollapsed = isParentCollapsedOrCurrentNodeCollapsed(
        parentCollapsed,
        field
      );

      if (doesFieldContainsChildren(field)) {
        const newSeekResult = seekField(
          fieldId,
          { found, YPosition, parentCollapsed: childParentCollapsed },
          field.children ?? []
        );

        if (newSeekResult.found) {
          return buildFieldFoundResponse(
            newSeekResult.parentCollapsed,
            newSeekResult.YPosition
          );
        }
      }
    }
  }

  return seekResult;
};

export const calculateRelationYOffset = (
  fieldId: GUID,
  table: TableVm
): number => {
  const initialYPosition = table.y + HEADER_HEIGHT;
  const result = seekField(
    fieldId,
    { found: false, parentCollapsed: false, YPosition: initialYPosition },
    table.fields
  );
  const center = result.YPosition + ROW_HEIGHT / 2;

  return center;
};

export interface YRelationCoords {
  yOrigin: number;
  yDestination: number;
}

export const calculateRelationYCoordinate = (
  fieldIdORigin: GUID,
  fieldIdDestination: GUID,
  tableOrigin: TableVm,
  tableDestination: TableVm
): YRelationCoords => ({
  yOrigin: calculateRelationYOffset(fieldIdORigin, tableOrigin),
  yDestination: calculateRelationYOffset(fieldIdDestination, tableDestination),
});
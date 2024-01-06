import React from 'react';
import { produce } from 'immer';
import { CanvasSchemaContext } from './canvas-schema.context';
import {
  DatabaseSchemaVm,
  TableVm,
  createDefaultDatabaseSchemaVm,
} from './canvas-schema.model';
import { Coords, GUID, Size } from '@/core/model';
// TODO: Move this business functionallity and tests
// from canvas to canvas-schema context
import {
  findField,
  moveTableToTop,
} from '@/core/providers/canvas-schema/canvas.business';

interface Props {
  children: React.ReactNode;
}

export const CanvasSchemaProvider: React.FC<Props> = props => {
  const { children } = props;
  // TODO: consider moving all these to useReducer (discuss first if needed)
  const [canvasSchema, setSchema] = React.useState<DatabaseSchemaVm>(
    createDefaultDatabaseSchemaVm()
  );

  const loadSchema = (newSchema: DatabaseSchemaVm) => {
    setSchema(newSchema);
  };

  const updateFullTable = (table: TableVm) => {
    // TODO: move this to index and add unit tests support
    setSchema(prevSchema =>
      produce(prevSchema, draft => {
        const tableIndex = draft.tables.findIndex(t => t.id === table.id);
        if (tableIndex !== -1) {
          draft.tables[tableIndex] = table;
        }
      })
    );
  };

  const addTable = (table: TableVm) => {
    setSchema(prevSchema =>
      produce(prevSchema, draft => {
        draft.tables.push(table);
      })
    );
  };

  const updateTablePosition = (
    id: string,
    position: Coords,
    totalHeight: number,
    canvasSize: Size
  ) => {
    setSchema(prevSchema =>
      moveTableToTop(prevSchema, { id, position, totalHeight }, canvasSize)
    );
  };

  const doFieldToggleCollapse = (tableId: string, fieldId: GUID): void => {
    setSchema(currentSchema =>
      produce(currentSchema, draft => {
        const table = draft.tables.find(t => t.id === tableId);
        if (table) {
          const field = findField(table.fields, fieldId);
          if (field) {
            field.isCollapsed = !field.isCollapsed;
          }
        }
      })
    );
  };

  return (
    <CanvasSchemaContext.Provider
      value={{
        canvasSchema,
        loadSchema,
        updateTablePosition,
        doFieldToggleCollapse,
        updateFullTable,
        addTable,
      }}
    >
      {children}
    </CanvasSchemaContext.Provider>
  );
};

export const useCanvasSchemaContext = () => {
  const context = React.useContext(CanvasSchemaContext);
  if (context === null) {
    throw 'useCanvasSchemaContext: looks like you have forgotten to add the provider on top of the app :)';
  }

  return context;
};

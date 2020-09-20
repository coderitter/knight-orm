import { DeleteCriteria, UpdateCriteria } from 'mega-nice-criteria'
import { getPropertyName, getRelationshipNames, isId, Relationship, Schema, Table } from './Schema'

export function instanceCriteriaToRowCriteria<T>(instanceCriteria: any, tableName: string, schema: Schema): T {
  let table = schema[tableName]

  if (table == undefined) {
    throw new Error('Table not contained in schema: ' + tableName)
  }

  let rowCriteria: any = {}

  for (let column of Object.keys(table.columns)) {
    let propertyName = getPropertyName(table.columns[column])
    let propertyValue = instanceCriteria[propertyName]

    if (propertyValue === undefined) {
      continue
    }

    rowCriteria[column] = propertyValue
  }

  for (let relationshipName of getRelationshipNames(table)) {
    let relationshipValue = instanceCriteria[relationshipName]
    let relationship = table[relationshipName] as Relationship

    if (relationshipValue === undefined) {
      continue
    }

    let relationshipTable = relationship.otherTable
    rowCriteria[relationshipName] = instanceCriteriaToRowCriteria(relationshipValue, relationshipTable, schema)
  }

  return <T> rowCriteria
}

export function rowToUpdateCriteria(row: any, table: Table): UpdateCriteria {
  let updateCriteria: any = {
    set: {}
  }

  for (let column of Object.keys(table.columns)) {
    if (isId(table.columns[column])) {
      updateCriteria[column] = row[column] === undefined ? null : row[column]
    }
    else if (column in row) {
      updateCriteria.set[column] = row[column]
    }
  }

  return updateCriteria
}

export function instanceToUpdateCriteria(instance: any, table: Table): UpdateCriteria {
  let row = table.instanceToRow(instance)
  return rowToUpdateCriteria(row, table)
}

export function rowToDeleteCriteria(row: any, table: Table): DeleteCriteria {
  let deleteCriteria: any = {}

  for (let column of Object.keys(table.columns)) {
    if (isId(table.columns[column])) {
      deleteCriteria[column] = row[column]
    }
  }

  return deleteCriteria
}

export function instanceToDeleteCriteria(instance: any, table: Table): DeleteCriteria {
  let row = table.instanceToRow(instance)
  return rowToDeleteCriteria(row, table)
}
import { expect } from 'chai'
import { Join, Query } from 'knight-sql'
import 'mocha'
import { Pool, PoolConfig } from 'pg'
import { Orm } from '../src'
import { QueryTools } from '../src/query'
import { schema } from './testSchema'

let pool: Pool = new Pool({
  host: 'postgres14',
  database: 'orm',
  user: 'orm',
  password: 'orm'
} as PoolConfig)

function pgQueryFn(sqlString: string, values?: any[]): Promise<any> {
  return pool.query(sqlString, values)
}

let queryTools = new QueryTools(new Orm(schema, 'postgres'))

class TestCriteria {
  property1 = 'a'
}

class TestSubCriteria extends TestCriteria {
  property2 = 1
}

class TestPropertyMethods {
  get property1() { return 'a' }
  get property2() { return 1 }
}

describe('query', function() {
  after(async function() {
    await pool.end()
  })

  beforeEach(async function() {
    await pool.query('CREATE TABLE table1 (id SERIAL, column1 VARCHAR(20), column2 INTEGER, column3 TIMESTAMP, many_to_one_object1_id INTEGER, many_to_one_object2_id VARCHAR(20), one_to_one_object1_id INTEGER, one_to_one_object2_id VARCHAR(20), one_to_many_object1_many_to_one_id INTEGER)')
    await pool.query('CREATE TABLE table2 (id VARCHAR(20), column1 VARCHAR(20), column2 INTEGER, column3 TIMESTAMP, one_to_one_object1_id INTEGER, one_to_many_object2_many_to_one_id INTEGER)')
    await pool.query('CREATE TABLE many_to_many_table1 (table1_id1 INTEGER, table1_id2 INTEGER, column1 VARCHAR(20), column2 INTEGER, column3 TIMESTAMP)')
    await pool.query('CREATE TABLE many_to_many_table2 (table1_id INTEGER, table2_id VARCHAR(20), column1 VARCHAR(20), column2 INTEGER, column3 TIMESTAMP)')
  })

  afterEach(async function() {
    await pool.query('DROP TABLE IF EXISTS table1 CASCADE')
    await pool.query('DROP TABLE IF EXISTS table2 CASCADE')
    await pool.query('DROP TABLE IF EXISTS many_to_many_table1 CASCADE')
    await pool.query('DROP TABLE IF EXISTS many_to_many_table2 CASCADE')
  })

  describe('databaseIndependentQuery', function() {
    describe('PostgreSQL', function() {
      it('should select all rows', async function() {
        await pgQueryFn('INSERT INTO table1 DEFAULT VALUES')
        await pgQueryFn('INSERT INTO table1 DEFAULT VALUES')
        await pgQueryFn('INSERT INTO table1 DEFAULT VALUES')

        let result = await queryTools.databaseIndependentQuery(pgQueryFn, 'SELECT * FROM table1 ORDER BY id')

        expect(result).to.deep.equal([
          {
            id: 1,
            column1: null,
            column2: null,
            column3: null,
            many_to_one_object1_id: null,
            many_to_one_object2_id: null,
            one_to_one_object1_id: null,
            one_to_one_object2_id: null,
            one_to_many_object1_many_to_one_id: null
          },
          {
            id: 2,
            column1: null,
            column2: null,
            column3: null,
            many_to_one_object1_id: null,
            many_to_one_object2_id: null,
            one_to_one_object1_id: null,
            one_to_one_object2_id: null,
            one_to_many_object1_many_to_one_id: null
          },
          {
            id: 3,
            column1: null,
            column2: null,
            column3: null,
            many_to_one_object1_id: null,
            many_to_one_object2_id: null,
            one_to_one_object1_id: null,
            one_to_one_object2_id: null,
            one_to_many_object1_many_to_one_id: null
          }
        ])
      })

      it('should insert a row', async function() {
        let result = await queryTools.databaseIndependentQuery(pgQueryFn, 'INSERT INTO table2 (id, column1) VALUES ($1, $2)', ['x', 'a'])

        expect(result).to.deep.equal({
          affectedRows: 1
        })
      })

      it('should insert a row and return the generated id', async function() {
        let result = await queryTools.databaseIndependentQuery(pgQueryFn, 'INSERT INTO table1 (column1) VALUES ($1)', ['a'], 'id')

        expect(result).to.deep.equal({
          affectedRows: 1,
          insertId: 1
        })
      })

      it('should update rows', async function() {
        await pgQueryFn('INSERT INTO table1 DEFAULT VALUES')
        await pgQueryFn('INSERT INTO table1 DEFAULT VALUES')
        await pgQueryFn('INSERT INTO table1 DEFAULT VALUES')

        let result = await queryTools.databaseIndependentQuery(pgQueryFn, 'UPDATE table1 SET column1=$1', ['a'])

        expect(result).to.deep.equal({
          affectedRows: 3
        })
      })

      it('should delete rows', async function() {
        await pgQueryFn('INSERT INTO table1 DEFAULT VALUES')
        await pgQueryFn('INSERT INTO table1 DEFAULT VALUES')
        await pgQueryFn('INSERT INTO table1 DEFAULT VALUES')

        let result = await queryTools.databaseIndependentQuery(pgQueryFn, 'DELETE FROM table1')

        expect(result).to.deep.equal({
          affectedRows: 3
        })
      })
    })
  })

  describe('addCriteria', function() {
    it('should add a simple equals comparison', function() {
      let criteria = {
        property1: 'a'
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
  
      expect(query._where!.mysql()).to.equal('t.column1 = ?')
      expect(query._where!.values()).to.deep.equal(['a'])
    })
  
    it('should add two simple equals comparisons which are AND connected', function() {
      let criteria = {
        property1: 'a',
        property2: 1
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
  
      expect(query._where!.mysql()).to.equal('t.column1 = ? AND t.column2 = ?')
      expect(query._where!.values()).to.deep.equal(['a',1])
    })
  
    it('should add a NOT negating a criteria object', function() {
      let criteria = {
        '@not': true,
        property1: 'a',
        property2: 1
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
  
      expect(query._where!.mysql()).to.equal('NOT (t.column1 = ? AND t.column2 = ?)')
      expect(query._where!.values()).to.deep.equal(['a',1])
    })
  
    it('should add a comparison', function() {
      let criteria = {
        property1: {
          '@operator': '<>',
          '@value': 'a'
        }
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
      
      expect(query._where!.mysql()).to.equal('t.column1 <> ?')
      expect(query._where!.values()).to.deep.equal(['a'])
    })
  
    it('should add a comparison with not', function() {
      let criteria = {
        property1: {
          '@not': true,
          '@operator': '<>',
          '@value': 'a'
        }
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
      
      expect(query._where!.mysql()).to.equal('NOT t.column1 <> ?')
      expect(query._where!.values()).to.deep.equal(['a'])
    })
  
    it('should add a simple comparison and a comparison object', function() {
      let criteria1 = {
        property1: {
          '@operator': '<>',
          '@value': 'a'
        },
        property2: 1
      }
  
      let query1 = new Query
      queryTools.addCriteria(schema.getTable('table1'), query1, criteria1)
      
      expect(query1._where!.mysql()).to.equal('t.column1 <> ? AND t.column2 = ?')
      expect(query1._where!.values()).to.deep.equal(['a',1])

      let criteria2 = {
        property1: 'a',
        property2: {
          '@operator': '<>',
          '@value': 1
        }
      }
  
      let query2 = new Query
      queryTools.addCriteria(schema.getTable('table1'), query2, criteria2)
      
      expect(query2._where!.mysql()).to.equal('t.column1 = ? AND t.column2 <> ?')
      expect(query2._where!.values()).to.deep.equal(['a',1])
    })
  
    it('should not add a comparison if the operator is not supported', function() {
      let criteria = {
        property1: {
          '@operator': '; DELETE FROM table1;',
          '@value': 'a'
        }
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
      
      expect(query._where!.mysql()).to.equal('')
      expect(query._where!.values()).to.deep.equal([])
    })
  
    it('should not add a property and value citerium if the value is undefined', function() {
      let criteria = {
        property1: {
          '@operator': '<>',
          '@value': undefined
        }
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
      
      expect(query._where!.mysql()).to.equal('')
    })

    it('should add a null criterium', function() {
      let criteria1 = {
        property1: null
      }
  
      let query1 = new Query
      queryTools.addCriteria(schema.getTable('table1'), query1, criteria1)
  
      expect(query1._where!.mysql()).to.equal('t.column1 IS NULL')
      expect(query1._where!.values()).to.deep.equal([])
  
      let criteria2 = {
        property1: {
          '@operator': '=',
          '@value': null
        }
      }
  
      let query2 = new Query
      queryTools.addCriteria(schema.getTable('table1'), query2, criteria2)
      
      expect(query2._where!.mysql()).to.equal('t.column1 IS NULL')
      expect(query2._where!.values()).to.deep.equal([])

      let criteria3 = {
        property1: {
          '@operator': '!=',
          '@value': null
        }
      }
  
      let query3 = new Query
      queryTools.addCriteria(schema.getTable('table1'), query3, criteria3)
      
      expect(query3._where!.mysql()).to.equal('t.column1 IS NOT NULL')
      expect(query3._where!.values()).to.deep.equal([])

      let criteria4 = {
        property1: {
          '@operator': '<>',
          '@value': null
        }
      }
  
      let query4 = new Query
      queryTools.addCriteria(schema.getTable('table1'), query4, criteria4)
      
      expect(query4._where!.mysql()).to.equal('t.column1 IS NOT NULL')
      expect(query4._where!.values()).to.deep.equal([])
    })
  
    it('should create an IN operator of an array of values', function() {
      let criteria1 = {
        property1: [1, 2, 3, 4]
      }
  
      let query1 = new Query
      queryTools.addCriteria(schema.getTable('table1'), query1, criteria1)
      
      expect(query1._where!.mysql()).to.equal('t.column1 IN (?, ?, ?, ?)')
      expect(query1._where!.values()).to.deep.equal([1,2,3,4])

      let criteria2 = {
        property1: ['a', 'b', 'c', 'd']
      }
  
      let query2 = new Query
      queryTools.addCriteria(schema.getTable('table1'), query2, criteria2)
      
      expect(query2._where!.mysql()).to.equal('t.column1 IN (?, ?, ?, ?)')
      expect(query2._where!.values()).to.deep.equal(['a', 'b', 'c', 'd'])
  
      let date1 = new Date
      let date2 = new Date
  
      let criteria3 = {
        property1: [date1, date2]
      }
  
      let query3 = new Query
      queryTools.addCriteria(schema.getTable('table1'), query3, criteria3)
      
      expect(query3._where!.mysql()).to.equal('t.column1 IN (?, ?)')
      expect(query3._where!.values()).to.deep.equal([date1, date2])
    })

    it('should accept an array of comparisons', function() {
      let criteria = {
        property2: [
          {
            '@operator': '<',
            '@value': 1
          },
          {
            '@not': true,
            '@operator': '>',
            '@value': 10
          }
        ]
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
      
      expect(query._where!.mysql()).to.equal('(t.column2 < ? OR NOT t.column2 > ?)')
      expect(query._where!.values()).to.deep.equal([1, 10])
    })
  
    it('should add an array of one comparison', function() {
      let criteria = {
        property2: [
          {
            '@operator': '<',
            '@value': 1
          }
        ]
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
      
      expect(query._where!.mysql()).to.equal('(t.column2 < ?)')
      expect(query._where!.values()).to.deep.equal([1])
    })
  
    it('should not add an array of one comparison if the operator is not supported', function() {
      let criteria = {
        property2: [
          {
            '@operator': '; DELETE FROM table1;',
            '@value': 1
          }
        ]
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
      
      expect(query._where!.mysql()).to.equal('')
      expect(query._where!.values()).to.deep.equal([])
    })
  
    it('should accept an array of comparisons and ignore those which values are undefined', function() {
      let criteria = {
        property2: [
          {
            '@operator': '>',
            '@value': undefined
          },
          {
            '@operator': '<',
            '@value': 1
          },
          {
            '@operator': '>',
            '@value': undefined
          }
        ]
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
      
      expect(query._where!.mysql()).to.equal('(t.column2 < ?)')
      expect(query._where!.values()).to.deep.equal([1])
    })
  
    it('should accept an array comparisons which values are undefined', function() {
      let criteria = {
        property2: [
          {
            '@operator': '>',
            '@value': undefined
          },
          {
            '@operator': '>',
            '@value': undefined
          }
        ]
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
      
      expect(query._where!.mysql()).to.equal('')
      expect(query._where!.values()).to.deep.equal([])
    })

    it('should set an empty array as always being false', function() {
      let criteria = {
        property1: []
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
  
      expect(query._where!.mysql()).to.equal('1 = 2')
      expect(query._where!.values()).to.deep.equal([])
    })
  
    it('should accept an array of comparisons which value is an empty array', function() {
      let criteria = {
        property2: [
          {
            '@operator': '=',
            '@value': []
          },
          {
            '@operator': 'IN',
            '@value': []
          },
          {
            '@operator': '!=',
            '@value': []
          },
          {
            '@operator': '<>',
            '@value': []
          },
          {
            '@operator': 'NOT IN',
            '@value': []
          },
          {
            '@not': true,
            '@operator': 'IN',
            '@value': []
          },
        ]
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
      
      expect(query._where!.mysql()).to.equal('(1 = 2 OR 1 = 2 OR 1 = 1 OR 1 = 1 OR 1 = 1 OR NOT 1 = 2)')
      expect(query._where!.values()).to.deep.equal([])
    })
  
    it('should accept an array of comparisons which are AND connected', function() {
      let criteria = {
        property2: [
          'AND',
          {
            '@operator': '>',
            '@value': 1
          },
          'AND',
          {
            '@not': true,
            '@operator': '<',
            '@value': 10
          },
          'AND'
        ]
      }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
      
      expect(query._where!.mysql()).to.equal('(t.column2 > ? AND NOT t.column2 < ?)')
      expect(query._where!.values()).to.deep.equal([1, 10])
    })

    it('should regard inherited properties', function() {
      let criteria = new TestSubCriteria
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
  
      expect(query._where!.mysql()).to.equal('t.column1 = ? AND t.column2 = ?')
      expect(query._where!.values()).to.deep.equal(['a', 1])
    })
  
    it('should regard property methods', function() {
      let criteria = new TestPropertyMethods
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
  
      expect(query._where!.mysql()).to.equal('t.column1 = ? AND t.column2 = ?')
      expect(query._where!.values()).to.deep.equal(['a', 1])
    })
  
    it('should add Date comparisons', function() {
      let now = new Date
      let criteria = { property1: now }
  
      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)
  
      expect(query._where!.mysql()).to.equal('t.column1 = ?')
      expect(query._where!.values()).to.deep.equal([now])
    })

    it('should join criteria for a relationship', function() {
      let criteria = {
        manyToManyObject2: {
          property1: 'a'
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._join!.pieces!.length).to.equal(1)
      expect((query._join!.pieces![0] as Join).type).to.equal('LEFT')
      expect((query._join!.pieces![0] as Join).table).to.equal('many_to_many_table2')
      expect((query._join!.pieces![0] as Join).alias).to.equal('t__8')
      expect((query._join!.pieces![0] as Join).on).to.equal('t.id = t__8.table1_id')
      expect(query._where!.mysql()).to.equal('t__8.column1 = ?')
      expect(query._where!.values()).to.deep.equal(['a'])
    })

    it('should join criteria for a relationship if it is to load', function() {
      let criteria = {
        manyToManyObject2: {
          '@load': true,
          property1: 'a'
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._join!.pieces!.length).to.equal(1)
      expect((query._join!.pieces![0] as Join).type).to.equal('LEFT')
      expect((query._join!.pieces![0] as Join).table).to.equal('many_to_many_table2')
      expect((query._join!.pieces![0] as Join).alias).to.equal('t__8')
      expect((query._join!.pieces![0] as Join).on).to.equal('t.id = t__8.table1_id')
      expect(query._where!.mysql()).to.equal('t__8.column1 = ?')
      expect(query._where!.values()).to.deep.equal(['a'])
    })

    it('should not join criteria for a relationship if it is to load with new query', function() {
      let criteria = {
        manyToManyObject2: {
          '@loadSeparately': true,
          property1: 'a'
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._join).to.be.undefined
      expect(query._where!.sql('mysql')).to.equal('')
    })

    it('should join criteria for a relationship of a relationship', function() {
      let criteria = {
        manyToManyObject2: {
          property1: 'a',
          object1: {
            property1: 'b'
          }
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._join!.pieces!.length).to.equal(2)
      expect((query._join!.pieces![0] as Join).type).to.equal('LEFT')
      expect((query._join!.pieces![0] as Join).table).to.equal('many_to_many_table2')
      expect((query._join!.pieces![0] as Join).alias).to.equal('t__8')
      expect((query._join!.pieces![0] as Join).on).to.equal('t.id = t__8.table1_id')
      expect((query._join!.pieces![1] as Join).type).to.equal('LEFT')
      expect((query._join!.pieces![1] as Join).table).to.equal('table1')
      expect((query._join!.pieces![1] as Join).alias).to.equal('t__8__0')
      expect((query._join!.pieces![1] as Join).on).to.equal('t__8.table1_id = t__8__0.id')
      expect(query._where!.mysql()).to.equal('t__8.column1 = ? AND t__8__0.column1 = ?')
      expect(query._where!.values()).to.deep.equal(['a','b'])
    })

    it('should not join criteria for a relationship of a relationship', function() {
      let criteria = {
        manyToManyObject2: {
          property1: 'a',
          object1: {
            '@loadSeparately': true,
            property1: 'b'
          }
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._join!.pieces!.length).to.equal(1)
      expect((query._join!.pieces![0] as Join).type).to.equal('LEFT')
      expect((query._join!.pieces![0] as Join).table).to.equal('many_to_many_table2')
      expect((query._join!.pieces![0] as Join).alias).to.equal('t__8')
      expect((query._join!.pieces![0] as Join).on).to.equal('t.id = t__8.table1_id')
      expect(query._where!.mysql()).to.equal('t__8.column1 = ?')
      expect(query._where!.values()).to.deep.equal(['a'])
    })

    it('should accept a criteria array', function() {
      let criteria = [
        'AND',
        {
          property1: 'a',
          property2: 1
        },
        'XOR',
        {
          property1: 'b',
          property2: 2
        },
        'OR'
      ]

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._where!.mysql()).to.equal('(t.column1 = ? AND t.column2 = ?) XOR (t.column1 = ? AND t.column2 = ?)')
      expect(query._where!.values()).to.deep.equal(['a',1,'b',2])
    })

    it('should accept an criteria array inside an criteria array', function() {
      let criteria = [
        {
          property1: 'a',
          property2: 1
        },
        'XOR',
        [
          {
            property1: 'b',
            property2: 2
          },
          {
            property1: 'c',
            property2: 3
          }
        ]
      ]

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._where!.mysql()).to.equal('(t.column1 = ? AND t.column2 = ?) XOR ((t.column1 = ? AND t.column2 = ?) OR (t.column1 = ? AND t.column2 = ?))')
      expect(query._where!.values()).to.deep.equal(['a',1,'b',2,'c',3])
    })

    it('should join a table for the same property only once', function() {
      let criteria = [
        {
          manyToOneObject2: {
            property1: 'a'
          }
        },
        {
          manyToOneObject2: {
            property1: 'b'
          }
        }
      ]

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._join!.pieces!.length).to.equal(1)
      expect(query._join!.pieces![0]).to.deep.equal({
        type: 'LEFT',
        table: 'table2',
        alias: 't__1',
        on: 't.many_to_one_object2_id = t__1.id'
      })
      expect(query._where!.mysql()).to.equal('(t__1.column1 = ?) OR (t__1.column1 = ?)')
      expect(query._where!.values()).to.deep.equal(['a','b'])
    })

    it('should add an order by condition', function() {
      let criteria = {
        '@orderBy': 'property1'
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.not.undefined
      expect(query._orderBy!.sql('mysql')).to.equal('t.column1')
    })

    it('should not add an order by condition if the column is invalid', function() {
      let criteria = {
        '@orderBy': 'property4'
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.undefined
    })

    it('should alias an order by condition in case of a relationship', function() {
      let criteria = {
        '@orderBy': 'property1',
        manyToManyObject2: {
          '@orderBy': 'property1'
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.not.undefined
      expect(query._orderBy!.sql('mysql')).to.equal('t.column1, t__8.column1')
    })

    it('should add multiple order by conditions', function() {
      let criteria = {
        '@orderBy': ['property1', 'property2']
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.not.undefined
      expect(query._orderBy!.sql('mysql')).to.equal('t.column1, t.column2')
    })

    it('should alias multiple order by conditions in case of a relationship', function() {
      let criteria = {
        '@orderBy': ['property1', 'property2'],
        manyToManyObject2: {
          '@orderBy': ['property1']
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.not.undefined
      expect(query._orderBy!.sql('mysql')).to.equal('t.column1, t.column2, t__8.column1')
    })

    it('should not add multiple order by conditions if they are invalid', function() {
      let criteria = {
        '@orderBy': ['property4', 'property5']
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.undefined
    })

    it('should add an order by condition with a given direction', function() {
      let criteria = {
        '@orderBy': {
          field: 'property1',
          direction: 'DESC'
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.not.undefined
      expect(query._orderBy!.sql('mysql')).to.equal('t.column1 DESC')
    })

    it('should alias an order by condition with a given direction in case of a relationship', function() {
      let criteria = {
        '@orderBy': {
          field: 'property1',
          direction: 'DESC'
        },
        manyToManyObject2: {
          '@orderBy': {
            field: 'property1',
            direction: 'ASC'
          }
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.not.undefined
      expect(query._orderBy!.sql('mysql')).to.equal('t.column1 DESC, t__8.column1 ASC')
    })

    it('should not add an order by condition with a given direction if the column is invalid', function() {
      let criteria = {
        '@orderBy': {
          field: 'property4',
          direction: 'DESC'
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.undefined
    })

    it('should add multiple order by conditions with a given direction', function() {
      let criteria = {
        '@orderBy': [
          {
            field: 'property1',
            direction: 'DESC'
          },
          {
            field: 'property2',
            direction: 'ASC'
          }
        ]
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.not.undefined
      expect(query._orderBy!.sql('mysql')).to.equal('t.column1 DESC, t.column2 ASC')
    })

    it('should alias multiple order by conditions with a given direction in case of a relationship', function() {
      let criteria = {
        '@orderBy': [
          {
            field: 'property1',
            direction: 'DESC'
          },
          {
            field: 'property2',
            direction: 'ASC'
          }
        ],
        manyToManyObject2: {
          '@orderBy': [
            {
              field: 'property1',
              direction: 'ASC'
            }
          ]
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.not.undefined
      expect(query._orderBy!.sql('mysql')).to.equal('t.column1 DESC, t.column2 ASC, t__8.column1 ASC')
    })

    it('should not add multiple order by conditions with a given direction if the columns are invalid', function() {
      let criteria = {
        '@orderBy': [
          {
            field: 'property4',
            direction: 'DESC'
          },
          {
            field: 'property5',
            direction: 'ASC'
          }
        ]
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._orderBy).to.be.undefined
    })

    it('should set a limit', function() {
      let criteria = {
        '@limit': 10
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._limit).to.equal(10)
    })

    it('should not overwrite an already existing limit', function() {
      let criteria = {
        '@limit': 10
      }

      let query = new Query
      query.limit(5)
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._limit).to.equal(5)
    })

    it('should not overwrite with a limit given in relationship criteria', function() {
      let criteria = {
        '@limit': 10,
        manyToManyObject2: {
          '@limit': 15
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._limit).to.equal(10)
    })

    it('should set an offset', function() {
      let criteria = {
        '@offset': 10
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._offset).to.equal(10)
    })

    it('should not overwrite an already existing offset', function() {
      let criteria = {
        '@offset': 10
      }

      let query = new Query
      query.offset(5)
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._offset).to.equal(5)
    })

    it('should not overwrite with an offset given in relationship criteria', function() {
      let criteria = {
        '@offset': 10,
        manyToManyObject2: {
          '@offset': 15
        }
      }

      let query = new Query
      queryTools.addCriteria(schema.getTable('table1'), query, criteria)

      expect(query._offset).to.equal(10)
    })
  })

  describe('buildLoadQuery', function() {
    it('should handle a simple select query', function() {
      let criteria = { property1: 'a', property2: 1 }
      let query = queryTools.buildLoadQuery(schema.getTable('table1'), criteria)
      expect(query.mysql()).to.equal('SELECT t.id "t_0", t.column1 "t_1", t.column2 "t_2", t.column3 "t_3", t.many_to_one_object1_id "t_4", t.many_to_one_object2_id "t_5", t.one_to_one_object1_id "t_6", t.one_to_one_object2_id "t_7", t.one_to_many_object1_many_to_one_id "t_8" FROM table1 t WHERE t.column1 = ? AND t.column2 = ?')
    })
  
    it('should handle inter table relationships', function() {
      let criteria = {
        id: 1,
        property1: 'a',
        manyToManyObject2: {
          '@load': true,
          property1: 'b',
          object2: {
            '@load': true,
            property1: 'c'
          }
        }
      }
  
      let query = queryTools.buildLoadQuery(schema.getTable('table1'), criteria)
  
      expect(query._select!.pieces!.length).to.equal(20)
      expect(query._select!.pieces![0]).to.equal('t.id "t_0"')
      expect(query._select!.pieces![1]).to.equal('t.column1 "t_1"')
      expect(query._select!.pieces![2]).to.equal('t.column2 "t_2"')
      expect(query._select!.pieces![3]).to.equal('t.column3 "t_3"')
      expect(query._select!.pieces![4]).to.equal('t.many_to_one_object1_id "t_4"')
      expect(query._select!.pieces![5]).to.equal('t.many_to_one_object2_id "t_5"')
      expect(query._select!.pieces![6]).to.equal('t.one_to_one_object1_id "t_6"')
      expect(query._select!.pieces![7]).to.equal('t.one_to_one_object2_id "t_7"')
      expect(query._select!.pieces![8]).to.equal('t.one_to_many_object1_many_to_one_id "t_8"')
      expect(query._select!.pieces![9]).to.equal('t__8.table1_id "t__8_0"')
      expect(query._select!.pieces![10]).to.equal('t__8.table2_id "t__8_1"')
      expect(query._select!.pieces![11]).to.equal('t__8.column1 "t__8_2"')
      expect(query._select!.pieces![12]).to.equal('t__8.column2 "t__8_3"')
      expect(query._select!.pieces![13]).to.equal('t__8.column3 "t__8_4"')
      expect(query._select!.pieces![14]).to.equal('t__8__1.id "t__8__1_0"')
      expect(query._select!.pieces![15]).to.equal('t__8__1.column1 "t__8__1_1"')
      expect(query._select!.pieces![16]).to.equal('t__8__1.column2 "t__8__1_2"')
      expect(query._select!.pieces![17]).to.equal('t__8__1.column3 "t__8__1_3"')
      expect(query._select!.pieces![18]).to.equal('t__8__1.one_to_one_object1_id "t__8__1_4"')
      expect(query._select!.pieces![19]).to.equal('t__8__1.one_to_many_object2_many_to_one_id "t__8__1_5"')
  
      expect(query.mysql()).to.equal('SELECT t.id "t_0", t.column1 "t_1", t.column2 "t_2", t.column3 "t_3", t.many_to_one_object1_id "t_4", t.many_to_one_object2_id "t_5", t.one_to_one_object1_id "t_6", t.one_to_one_object2_id "t_7", t.one_to_many_object1_many_to_one_id "t_8", t__8.table1_id "t__8_0", t__8.table2_id "t__8_1", t__8.column1 "t__8_2", t__8.column2 "t__8_3", t__8.column3 "t__8_4", t__8__1.id "t__8__1_0", t__8__1.column1 "t__8__1_1", t__8__1.column2 "t__8__1_2", t__8__1.column3 "t__8__1_3", t__8__1.one_to_one_object1_id "t__8__1_4", t__8__1.one_to_many_object2_many_to_one_id "t__8__1_5" FROM table1 t LEFT JOIN many_to_many_table2 t__8 ON t.id = t__8.table1_id LEFT JOIN table2 t__8__1 ON t__8.table2_id = t__8__1.id WHERE t.id = ? AND t.column1 = ? AND t__8.column1 = ? AND t__8__1.column1 = ?')
    })

    it('should join one-to-many relationships which are criteria-less', function() {
      let criteria = {
        manyToManyObject2: {
          object2: {}
        }
      }
  
      let query = queryTools.buildLoadQuery(schema.getTable('table1'), criteria)
  
      expect(query._select!.pieces!.length).to.equal(20)
      expect(query._select!.pieces![0]).to.equal('t.id "t_0"')
      expect(query._select!.pieces![1]).to.equal('t.column1 "t_1"')
      expect(query._select!.pieces![2]).to.equal('t.column2 "t_2"')
      expect(query._select!.pieces![3]).to.equal('t.column3 "t_3"')
      expect(query._select!.pieces![4]).to.equal('t.many_to_one_object1_id "t_4"')
      expect(query._select!.pieces![5]).to.equal('t.many_to_one_object2_id "t_5"')
      expect(query._select!.pieces![6]).to.equal('t.one_to_one_object1_id "t_6"')
      expect(query._select!.pieces![7]).to.equal('t.one_to_one_object2_id "t_7"')
      expect(query._select!.pieces![8]).to.equal('t.one_to_many_object1_many_to_one_id "t_8"')
      expect(query._select!.pieces![9]).to.equal('t__8.table1_id "t__8_0"')
      expect(query._select!.pieces![10]).to.equal('t__8.table2_id "t__8_1"')
      expect(query._select!.pieces![11]).to.equal('t__8.column1 "t__8_2"')
      expect(query._select!.pieces![12]).to.equal('t__8.column2 "t__8_3"')
      expect(query._select!.pieces![13]).to.equal('t__8.column3 "t__8_4"')
      expect(query._select!.pieces![14]).to.equal('t__8__1.id "t__8__1_0"')
      expect(query._select!.pieces![15]).to.equal('t__8__1.column1 "t__8__1_1"')
      expect(query._select!.pieces![16]).to.equal('t__8__1.column2 "t__8__1_2"')
      expect(query._select!.pieces![17]).to.equal('t__8__1.column3 "t__8__1_3"')
      expect(query._select!.pieces![18]).to.equal('t__8__1.one_to_one_object1_id "t__8__1_4"')
      expect(query._select!.pieces![19]).to.equal('t__8__1.one_to_many_object2_many_to_one_id "t__8__1_5"')

      expect(query.mysql()).to.equal('SELECT t.id "t_0", t.column1 "t_1", t.column2 "t_2", t.column3 "t_3", t.many_to_one_object1_id "t_4", t.many_to_one_object2_id "t_5", t.one_to_one_object1_id "t_6", t.one_to_one_object2_id "t_7", t.one_to_many_object1_many_to_one_id "t_8", t__8.table1_id "t__8_0", t__8.table2_id "t__8_1", t__8.column1 "t__8_2", t__8.column2 "t__8_3", t__8.column3 "t__8_4", t__8__1.id "t__8__1_0", t__8__1.column1 "t__8__1_1", t__8__1.column2 "t__8__1_2", t__8__1.column3 "t__8__1_3", t__8__1.one_to_one_object1_id "t__8__1_4", t__8__1.one_to_many_object2_many_to_one_id "t__8__1_5" FROM table1 t LEFT JOIN many_to_many_table2 t__8 ON t.id = t__8.table1_id LEFT JOIN table2 t__8__1 ON t__8.table2_id = t__8__1.id')
    })
  })
})


describe('rowSorter', function() {
  var grid, $scope, $compile, recompile, uiGridConstants, rowSorter, gridClassFactory, Grid, GridColumn, GridRow;

  var data = [
    { "name": "Ethel Price", "gender": "female", "company": "Enersol" },
    { "name": "Claudine Neal", "gender": "female", "company": "Sealoud" },
    { "name": "Beryl Rice", "gender": "female", "company": "Velity" },
    { "name": "Wilder Gonzales", "gender": "male", "company": "Geekko" }
  ];

  beforeEach(module('ui.grid'));

  beforeEach(inject(function (_$compile_, $rootScope, _uiGridConstants_, _rowSorter_, _Grid_, _GridColumn_, _GridRow_, _gridClassFactory_) {
    $scope = $rootScope;
    $compile = _$compile_;
    uiGridConstants = _uiGridConstants_;
    rowSorter = _rowSorter_;
    Grid = _Grid_;
    GridColumn = _GridColumn_;
    GridRow = _GridRow_;
    gridClassFactory = _gridClassFactory_;

    // $scope.gridOpts = {
    //   data: data
    // };

    // recompile = function () {
    //   grid = angular.element('<div style="width: 500px; height: 300px" ui-grid="gridOpts"></div>');
    //   // document.body.appendChild(grid[0]);
    //   $compile(grid)($scope);
    //   $scope.$digest();
    // };

    // recompile();
  }));

  afterEach(function () {
    // grid = null;
  });

  // TODO(c0bra): Add test for grid sorting constants?

  describe('guessSortFn', function () {
    it('should guess a number', function () {
      var guessFn = rowSorter.guessSortFn('number');
      expect(guessFn).toBe(rowSorter.sortNumber);
    });

    it('should guess a date', function () {
      var guessFn = rowSorter.guessSortFn('date');

      expect(guessFn).toBe(rowSorter.sortDate);
    });

    it('should guess a string', function () {
      var guessFn = rowSorter.guessSortFn("string");

      expect(guessFn).toBe(rowSorter.sortAlpha);
    });

    it('should guess a number-string when the value is a numeric string', function () {
      var guessFn = rowSorter.guessSortFn('500');
      expect(guessFn).toBe(rowSorter.sortNumberStr, '500');

      guessFn = rowSorter.guessSortFn('500.00');
      expect(guessFn).toBe(rowSorter.sortNumberStr, '500.00');

      guessFn = rowSorter.guessSortFn('-500.00');
      expect(guessFn).toBe(rowSorter.sortNumberStr, '-500.00');
    });

    it('should guess a number-string when the value is currency', function () {
      var guessFn = rowSorter.guessSortFn('$500');
      expect(guessFn).toBe(rowSorter.sortNumberStr, '$500');

      guessFn = rowSorter.guessSortFn('¥500');
      expect(guessFn).toBe(rowSorter.sortNumberStr, '¥500');
    });

    it('should allow a currency symbol to come after the number', function () {
      var guessFn = rowSorter.guessSortFn('500$');
      expect(guessFn).toBe(rowSorter.sortNumberStr, '500$');
    });

    it('should allow percents', function () {
      var guessFn = rowSorter.guessSortFn('75.25%');
      expect(guessFn).toBe(rowSorter.sortNumberStr, '75.25%');
    });

    it('should not allow percent signs before the number', function () {
      var guessFn = rowSorter.guessSortFn('%75.25');
      expect(guessFn).toBe(rowSorter.sortAlpha, '%75.25');
    });

    it('should allow booleans', function () {
      var guessFn = rowSorter.guessSortFn('boolean');
      expect(guessFn).toBe(rowSorter.sortBool);
    });

    it('should use basicSort for objects', function () {
      var guessFn = rowSorter.guessSortFn('object');
      expect(guessFn).toBe(rowSorter.basicSort);
    });
  });

  describe('sort', function() {
    var grid, rows, cols;

    beforeEach(function() {
      grid = new Grid({ id: 123 });

      var e1 = { name: 'Bob' };
      var e2 = { name: 'Jim' };

      rows = [
        new GridRow(e1, 0),
        new GridRow(e2, 1)
      ];

      cols = [
        new GridColumn({
          name: 'name',
          type: 'string',
          sort: {
            direction: uiGridConstants.ASC,
            priority: 0
          }
        }, 0, grid)
      ];
    });

    it('should sort this ascending', function() {
      var ret = rowSorter.sort(grid, rows, cols);

      expect(ret[0].entity.name).toEqual('Bob');
    });

    it('should sort things descending', function() {
      cols[0].sort.direction = uiGridConstants.DESC;

      var ret = rowSorter.sort(grid, rows, cols);

      expect(ret[0].entity.name).toEqual('Jim');
    });

    // TODO(c0bra) ...
    describe('with a custom sorting algorithm', function () {
      beforeEach(function() {

      });

      it("should use the column's specified sorting algorithm if it has one", function () {
        cols[0] = new GridColumn({
          name: 'name',
          type: 'string',
          sortingAlgorithm: jasmine.createSpy('sortingAlgorithm').andReturn(rows),
          sort: {
            direction: uiGridConstants.ASC,
            priority: 0
          }
        }, 0, grid);

        rowSorter.sort(grid, rows, cols);

        expect(cols[0].sortingAlgorithm).toHaveBeenCalled();
      });

      it('should run and use the sorting algorithm output properly', function() {
        cols[0] = new GridColumn({
          name: 'name',
          type: 'string',
          // Sort words containing the letter 'i' to the top
          sortingAlgorithm: function (a, b) {
            var r = 0;
            if (/i/.test(a) && /i/.test(b)) {
              r = 0;
            }
            else if (/i/.test(a)) {
              r = -1;
            }
            else if (/i/.test(b)) {
              r = 1;
            }

            return r;
          },
          sort: {
            direction: uiGridConstants.ASC,
            priority: 0
          }
        }, 0, grid);

        var ret = rowSorter.sort(grid, rows, cols);

        expect(ret[0].entity.name).toEqual('Jim');
      });
    });
  });

  describe('external sort', function() {
    var grid, rows, cols, column, timeoutRows, returnedRows, $timeout;

    beforeEach(inject(function(_$timeout_) {
      $timeout = _$timeout_;

      timeoutRows = [new GridRow({ name: 'Frank' }, 0)];

      grid = gridClassFactory.createGrid({
        externalSort: jasmine.createSpy('externalSort')
                        .andCallFake(function (r) {
                          return $timeout(function() {
                            return timeoutRows;
                          }, 1000);
                        })
      });

      // grid.options.externalSort = function (grid, column, rows) {
      //   // sort stuff here
      // };

      var e1 = { name: 'Bob' };
      var e2 = { name: 'Jim' };

      rows = grid.rows = [
        new GridRow(e1, 0),
        new GridRow(e2, 1)
      ];

      column = new GridColumn({
        name: 'name'
      }, 0, grid);

      cols = grid.columns = [column];
    }));

    it('should run', function() {
      grid.sortColumn(column);

      runs(function() {
        grid.processRowsProcessors(grid.rows)
          .then(function (newRows) {
            returnedRows = newRows;
          });

        // Have to flush $timeout once per processor, as they run consecutively
        for (var i = 0; i < grid.rowsProcessors.length; i++) {
          $timeout.flush();
        }
        
        $scope.$digest();
      });

      runs(function (){
        expect(grid.options.externalSort).toHaveBeenCalled();

        expect(returnedRows).toEqual(timeoutRows);
      });
    });
  });

});
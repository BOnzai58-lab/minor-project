import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Stack,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  WarningAmber as WarningAmberIcon,
  Inventory2 as Inventory2Icon,
  LocalShipping as LocalShippingIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { getInventoryMetadata, getInventoryRecommendations } from '../services/api';

const getRiskTier = (riskScore) => {
  if (riskScore >= 75) return 'Critical';
  if (riskScore >= 50) return 'High';
  if (riskScore >= 25) return 'Medium';
  return 'Low';
};

function Inventory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [metadata, setMetadata] = useState({
    regions: [],
    recommendations: ['Restock', 'Overstock', 'Stock OK'],
  });
  const [filters, setFilters] = useState({
    region: 'All',
    recommendation: 'All',
    riskTier: 'All',
    search: '',
  });

  const fetchData = async (selectedRegion, selectedRecommendation) => {
    try {
      setLoading(true);
      setError(null);
      const apiFilters = {
        region: selectedRegion,
        recommendation: selectedRecommendation,
      };
      const [metadataResponse, recommendationResponse] = await Promise.all([
        getInventoryMetadata(),
        getInventoryRecommendations(apiFilters),
      ]);
      setMetadata(metadataResponse);
      setData(recommendationResponse);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(filters.region, filters.recommendation);
  }, [filters.region, filters.recommendation]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      region: 'All',
      recommendation: 'All',
      riskTier: 'All',
      search: '',
    });
  };

  const filteredRows = useMemo(() => {
    const rows = data?.items || [];
    return rows.filter((row) => {
      const riskMatch =
        filters.riskTier === 'All' || getRiskTier(row.risk_score || 0) === filters.riskTier;
      const searchText = filters.search.trim().toLowerCase();
      const searchMatch =
        !searchText ||
        String(row.product_name || '').toLowerCase().includes(searchText) ||
        String(row.region || '').toLowerCase().includes(searchText) ||
        String(row.product_id || '').includes(searchText);
      return riskMatch && searchMatch;
    });
  }, [data, filters.riskTier, filters.search]);

  const criticalItems = filteredRows.filter((row) => (row.risk_score || 0) >= 75).length;
  const avgRiskScore = filteredRows.length
    ? Math.round(filteredRows.reduce((sum, row) => sum + (row.risk_score || 0), 0) / filteredRows.length)
    : 0;
  const totalSuggestedOrder = filteredRows.reduce((sum, row) => sum + (row.suggested_order_qty || 0), 0);
  const restockCount = filteredRows.filter((row) => row.recommendation === 'Restock').length;

  const columns = [
    { field: 'product_id', headerName: 'ID', width: 90 },
    { field: 'product_name', headerName: 'Product', width: 170, flex: 1 },
    { field: 'product_category', headerName: 'Category', width: 120 },
    { field: 'region', headerName: 'Region', width: 120 },
    {
      field: 'unit_price_npr',
      headerName: 'Unit Price',
      width: 120,
      valueFormatter: (params) => `NPR ${Number(params.value || 0).toFixed(0)}`,
    },
    {
      field: 'shelf_life_days',
      headerName: 'Shelf Life',
      width: 110,
      valueFormatter: (params) => (params.value == null ? 'N/A' : `${params.value}d`),
    },
    { field: 'current_stock', headerName: 'Current Stock', width: 130 },
    {
      field: 'predicted_demand',
      headerName: 'Predicted Demand',
      width: 150,
      valueFormatter: (params) => Number(params.value || 0).toFixed(2),
    },
    { field: 'restock_threshold', headerName: 'Threshold', width: 120 },
    {
      field: 'stock_cover_days',
      headerName: 'Cover (days)',
      width: 120,
      valueFormatter: (params) => (params.value == null ? 'N/A' : Number(params.value).toFixed(2)),
    },
    {
      field: 'risk_score',
      headerName: 'Risk',
      width: 145,
      renderCell: (params) => {
        const riskScore = params.value || 0;
        const tier = getRiskTier(riskScore);
        const color =
          tier === 'Critical'
            ? 'error'
            : tier === 'High'
            ? 'warning'
            : tier === 'Medium'
            ? 'info'
            : 'success';
        return <Chip size="small" label={`${riskScore} ${tier}`} color={color} />;
      },
    },
    {
      field: 'suggested_order_qty',
      headerName: 'Suggested Order',
      width: 150,
      valueFormatter: (params) => (params.value > 0 ? params.value : '-'),
    },
    {
      field: 'recommendation',
      headerName: 'Action',
      width: 130,
      renderCell: (params) => (
        <Typography
          sx={{
            fontWeight: 700,
            color:
              params.value === 'Restock'
                ? 'error.main'
                : params.value === 'Overstock'
                ? 'warning.main'
                : 'success.main',
          }}
        >
          {params.value}
        </Typography>
      ),
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={1}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" gutterBottom sx={{ mb: 0.5 }}>
            Inventory Intelligence
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor stock health, demand risk, and replenishment priorities in one place.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => fetchData(filters.region, filters.recommendation)}
        >
          Refresh
        </Button>
      </Stack>

      <Paper sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Region"
              name="region"
              value={filters.region}
              onChange={handleFilterChange}
            >
              {['All', ...metadata.regions].map((region) => (
                <MenuItem key={region} value={region}>
                  {region}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              select
              fullWidth
              label="Recommendation"
              name="recommendation"
              value={filters.recommendation}
              onChange={handleFilterChange}
            >
              {['All', ...(metadata.recommendations || [])].map((rec) => (
                <MenuItem key={rec} value={rec}>
                  {rec}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              fullWidth
              label="Risk Tier"
              name="riskTier"
              value={filters.riskTier}
              onChange={handleFilterChange}
            >
              {['All', 'Critical', 'High', 'Medium', 'Low'].map((tier) => (
                <MenuItem key={tier} value={tier}>
                  {tier}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Search Product/Region/ID"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={1}>
            <Button
              fullWidth
              variant="text"
              onClick={handleResetFilters}
              sx={{ height: '100%' }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Items in View
                  </Typography>
                  <Typography variant="h5">{filteredRows.length}</Typography>
                </Box>
                <Inventory2Icon color="primary" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Average Risk
                  </Typography>
                  <Typography variant="h5">{avgRiskScore}</Typography>
                </Box>
                <WarningAmberIcon color="warning" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Critical / Restock
                  </Typography>
                  <Typography variant="h5">
                    {criticalItems} / {restockCount}
                  </Typography>
                </Box>
                <WarningAmberIcon color="error" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Suggested Orders
                  </Typography>
                  <Typography variant="h5">{totalSuggestedOrder}</Typography>
                </Box>
                <LocalShippingIcon color="secondary" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ width: '100%', border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="h6">Inventory Action Table</Typography>
          <Typography variant="body2" color="text.secondary">
            Sorted by highest risk to prioritize immediate action.
          </Typography>
        </Box>
        <Divider />
        <DataGrid
          rows={filteredRows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          disableSelectionOnClick
          getRowId={(row) => `${row.product_id}-${row.region}`}
          sortingOrder={['desc', 'asc']}
          initialState={{
            sorting: {
              sortModel: [{ field: 'risk_score', sort: 'desc' }],
            },
          }}
          sx={{
            border: 0,
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'rgba(11, 93, 91, 0.06)',
              borderBottom: '1px solid rgba(11, 93, 91, 0.12)',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            },
          }}
        />
      </Paper>
    </Box>
  );
}

export default Inventory;

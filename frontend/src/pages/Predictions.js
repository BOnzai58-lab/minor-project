import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { getInventoryMetadata, predictDemand } from '../services/api';

function parseNullableBool(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function Predictions() {
  const [formData, setFormData] = useState({
    date: new Date(),
    product_id: '',
    region: '',
    weather: '',
    temp_c: '',
    season: '',
    is_festival: '',
    is_holiday: '',
    is_weekend: '',
    economic_index: '',
    current_stock: '',
    horizon: 'daily',
    periods: 30,
  });

  const [loading, setLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [metadata, setMetadata] = useState({
    products: [],
    regions: [],
    weather_conditions: [],
    seasons: ['Winter', 'Spring', 'Summer', 'Autumn'],
    horizons: ['daily', 'monthly', 'yearly'],
  });

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const response = await getInventoryMetadata();
        setMetadata((prev) => ({ ...prev, ...response }));
      } catch (err) {
        setError(err.message);
      } finally {
        setMetadataLoading(false);
      }
    };

    loadMetadata();
  }, []);

  useEffect(() => {
    setFormData((prev) => {
      if (prev.horizon === 'daily') return { ...prev, periods: 30 };
      if (prev.horizon === 'monthly') return { ...prev, periods: 12 };
      return { ...prev, periods: 3 };
    });
  }, [formData.horizon]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      date,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const payload = {
        date: formData.date.toISOString().split('T')[0],
        product_id: parseInt(formData.product_id, 10),
        region: formData.region,
        weather: formData.weather || null,
        temp_c: formData.temp_c === '' ? null : Number(formData.temp_c),
        season: formData.season || null,
        is_festival: parseNullableBool(formData.is_festival),
        is_holiday: parseNullableBool(formData.is_holiday),
        is_weekend: parseNullableBool(formData.is_weekend),
        economic_index: formData.economic_index === '' ? null : Number(formData.economic_index),
        current_stock:
          formData.current_stock !== '' && formData.current_stock !== null && formData.current_stock !== undefined
            ? parseInt(formData.current_stock, 10)
            : null,
        horizon: formData.horizon,
        periods: Math.max(1, parseInt(formData.periods, 10) || 1),
      };

      const response = await predictDemand(payload);
      setPrediction(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (metadataLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Demand Prediction
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Forecast demand using external factors (temperature, seasonality, holidays/weekends, and economic index)
        with daily/monthly/yearly horizons.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Start Date"
                      value={formData.date}
                      onChange={handleDateChange}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Product"
                    name="product_id"
                    value={formData.product_id}
                    onChange={handleInputChange}
                    required
                  >
                    {metadata.products.map((product) => (
                      <MenuItem key={product.product_id} value={product.product_id}>
                        {product.product_name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Region"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    required
                  >
                    {metadata.regions.map((region) => (
                      <MenuItem key={region} value={region}>
                        {region}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    select
                    fullWidth
                    label="Horizon"
                    name="horizon"
                    value={formData.horizon}
                    onChange={handleInputChange}
                    required
                  >
                    {(metadata.horizons || ['daily', 'monthly', 'yearly']).map((h) => (
                      <MenuItem key={h} value={h}>
                        {h}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={3}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Periods"
                    name="periods"
                    value={formData.periods}
                    onChange={handleInputChange}
                    inputProps={{ min: 1 }}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Weather"
                    name="weather"
                    value={formData.weather}
                    onChange={handleInputChange}
                  >
                    <MenuItem value="">Auto</MenuItem>
                    {metadata.weather_conditions.map((weather) => (
                      <MenuItem key={weather} value={weather}>
                        {weather}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Temperature C"
                    name="temp_c"
                    value={formData.temp_c}
                    onChange={handleInputChange}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Season"
                    name="season"
                    value={formData.season}
                    onChange={handleInputChange}
                  >
                    <MenuItem value="">Auto</MenuItem>
                    {(metadata.seasons || []).map((season) => (
                      <MenuItem key={season} value={season}>
                        {season}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Economic Index"
                    name="economic_index"
                    value={formData.economic_index}
                    onChange={handleInputChange}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    label="Holiday"
                    name="is_holiday"
                    value={formData.is_holiday}
                    onChange={handleInputChange}
                  >
                    <MenuItem value="">Auto</MenuItem>
                    <MenuItem value="true">Yes</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    label="Festival"
                    name="is_festival"
                    value={formData.is_festival}
                    onChange={handleInputChange}
                  >
                    <MenuItem value="">Auto</MenuItem>
                    <MenuItem value="true">Yes</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    label="Weekend"
                    name="is_weekend"
                    value={formData.is_weekend}
                    onChange={handleInputChange}
                  >
                    <MenuItem value="">Auto</MenuItem>
                    <MenuItem value="true">Yes</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    type="number"
                    fullWidth
                    label="Current Stock"
                    name="current_stock"
                    value={formData.current_stock}
                    onChange={handleInputChange}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Run Forecast'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {prediction && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Forecast Summary
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Horizon: {prediction.horizon} | Periods: {prediction.periods}
                </Typography>
                <Box mt={2}>
                  <Typography variant="body1" gutterBottom>
                    Next Predicted Demand: {prediction.predicted_demand?.toFixed(2)} units
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    Recommendation: {prediction.recommendation}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    Confidence Score: {(prediction.confidence_score * 100).toFixed(2)}%
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" gutterBottom>
                  Forecast Points
                </Typography>
                <Stack spacing={1} sx={{ maxHeight: 280, overflow: 'auto' }}>
                  {(prediction.forecasts || []).map((item) => (
                    <Paper key={`${item.period_label}-${item.date}`} variant="outlined" sx={{ p: 1.2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {item.period_label}
                      </Typography>
                      <Typography variant="body2">
                        Demand: {Number(item.predicted_demand || 0).toFixed(2)} | Action: {item.recommendation}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default Predictions;

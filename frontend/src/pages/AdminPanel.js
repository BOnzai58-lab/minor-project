import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  adjustInventory,
  createProduct,
  createUserByAdmin,
  getAuthLogs,
  getInventoryRecords,
  getProducts,
  getStockTransactions,
  getTrainOptions,
  getUsers,
  trainModel,
} from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventoryRecords, setInventoryRecords] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [authLogs, setAuthLogs] = useState([]);
  const [modelOptions, setModelOptions] = useState({});
  const [selectedModelType, setSelectedModelType] = useState('xgboost');
  const [trainingData, setTrainingData] = useState(null);

  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'user',
  });
  const [productForm, setProductForm] = useState({
    name: '',
    product_code: '',
    category: '',
    unit_price_npr: '',
    shelf_life_days: '',
  });
  const [adjustForm, setAdjustForm] = useState({
    product_id: '',
    region: '',
    quantity_delta: '',
    restock_threshold: '',
    reason: 'manual_adjustment',
    notes: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, productsData, inventoryData, transactionData, authLogsData, trainOptionsData] = await Promise.all([
        getUsers(),
        getProducts(),
        getInventoryRecords(),
        getStockTransactions(25),
        getAuthLogs(25),
        getTrainOptions(),
      ]);
      setUsers(usersData);
      setProducts(productsData);
      setInventoryRecords(inventoryData);
      setTransactions(transactionData);
      setAuthLogs(authLogsData);
      setModelOptions(trainOptionsData.models || {});
      if (trainOptionsData.models && !trainOptionsData.models[selectedModelType]) {
        const first = Object.keys(trainOptionsData.models)[0];
        if (first) setSelectedModelType(first);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedModelType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTrainModel = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setResult(null);
      const response = await trainModel({ model_type: selectedModelType });
      setTrainingData(response.training || null);
      const rmse = response.training?.metrics?.rmse;
      const r2 = response.training?.metrics?.r2;
      const modelName = response.training?.model_name || selectedModelType;
      setResult(`Training completed with ${modelName}. RMSE: ${rmse?.toFixed?.(2) ?? rmse}, R2: ${r2?.toFixed?.(3) ?? r2}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const learningCurve = trainingData?.charts?.learning_curve || {};
  const featureImportance = trainingData?.charts?.feature_importance || [];
  const residualDistribution = trainingData?.charts?.residual_distribution || [];

  const learningCurveData = {
    labels: (learningCurve.steps || []).map((v) => `${v}`),
    datasets: [
      {
        label: 'Train RMSE',
        data: learningCurve.train_rmse || [],
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.15)',
        tension: 0.25,
      },
      {
        label: 'Validation RMSE',
        data: learningCurve.val_rmse || [],
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.15)',
        tension: 0.25,
      },
    ],
  };

  const featureImportanceData = {
    labels: featureImportance.map((f) => f.feature),
    datasets: [
      {
        label: 'Importance',
        data: featureImportance.map((f) => f.importance),
        backgroundColor: 'rgba(14,165,233,0.7)',
        borderColor: '#0284c7',
        borderWidth: 1,
      },
    ],
  };

  const residualData = {
    labels: residualDistribution.map((r) => r.range),
    datasets: [
      {
        label: 'Residual Count',
        data: residualDistribution.map((r) => r.count),
        backgroundColor: 'rgba(168,85,247,0.7)',
        borderColor: '#9333ea',
        borderWidth: 1,
      },
    ],
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      await createUserByAdmin({
        username: userForm.username.trim(),
        password: userForm.password,
        role: userForm.role,
      });
      setResult('User created successfully.');
      setUserForm({ username: '', password: '', role: 'user' });
      setUsers(await getUsers());
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      await createProduct({
        name: productForm.name.trim(),
        product_code: productForm.product_code.trim() || null,
        category: productForm.category.trim() || null,
        unit_price_npr: productForm.unit_price_npr === '' ? null : Number(productForm.unit_price_npr),
        shelf_life_days: productForm.shelf_life_days === '' ? null : parseInt(productForm.shelf_life_days, 10),
      });
      setResult('Product created successfully.');
      setProductForm({ name: '', product_code: '', category: '', unit_price_npr: '', shelf_life_days: '' });
      setProducts(await getProducts());
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustInventory = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError(null);
      await adjustInventory({
        product_id: parseInt(adjustForm.product_id, 10),
        region: adjustForm.region.trim(),
        quantity_delta: parseInt(adjustForm.quantity_delta, 10),
        restock_threshold:
          adjustForm.restock_threshold === '' ? null : parseInt(adjustForm.restock_threshold, 10),
        reason: adjustForm.reason.trim() || 'manual_adjustment',
        notes: adjustForm.notes.trim() || null,
      });
      setResult('Inventory adjusted successfully.');
      setAdjustForm({
        product_id: '',
        region: '',
        quantity_delta: '',
        restock_threshold: '',
        reason: 'manual_adjustment',
        notes: '',
      });
      const [inventoryData, transactionData] = await Promise.all([
        getInventoryRecords(),
        getStockTransactions(25),
      ]);
      setInventoryRecords(inventoryData);
      setTransactions(transactionData);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Workspace
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {result && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {result}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                ML Model Operations
              </Typography>
              <TextField
                select
                fullWidth
                margin="dense"
                label="Training Model Type"
                value={selectedModelType}
                onChange={(e) => setSelectedModelType(e.target.value)}
              >
                {Object.entries(modelOptions).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
              <Button sx={{ mt: 1 }} variant="contained" onClick={handleTrainModel} disabled={actionLoading}>
                {actionLoading ? <CircularProgress size={24} /> : 'Train Model'}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Train with selected algorithm and view MSE, RMSE, R2, MAPE and training graphs.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create User/Admin
              </Typography>
              <Box component="form" onSubmit={handleCreateUser}>
                <TextField
                  fullWidth
                  margin="dense"
                  label="Username"
                  value={userForm.username}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))}
                  required
                />
                <TextField
                  fullWidth
                  margin="dense"
                  label="Password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
                <TextField
                  select
                  fullWidth
                  margin="dense"
                  label="Role"
                  value={userForm.role}
                  onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value }))}
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </TextField>
                <Button sx={{ mt: 1 }} type="submit" variant="contained" disabled={actionLoading}>
                  Add User
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create Product
              </Typography>
              <Box component="form" onSubmit={handleCreateProduct}>
                <TextField
                  fullWidth
                  margin="dense"
                  label="Product Name"
                  value={productForm.name}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
                <TextField
                  fullWidth
                  margin="dense"
                  label="Product Code (ID)"
                  value={productForm.product_code}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, product_code: e.target.value }))}
                />
                <TextField
                  fullWidth
                  margin="dense"
                  label="Category"
                  value={productForm.category}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, category: e.target.value }))}
                />
                <TextField
                  fullWidth
                  margin="dense"
                  type="number"
                  label="Unit Price (NPR)"
                  value={productForm.unit_price_npr}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, unit_price_npr: e.target.value }))}
                />
                <TextField
                  fullWidth
                  margin="dense"
                  type="number"
                  label="Shelf Life (days)"
                  value={productForm.shelf_life_days}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, shelf_life_days: e.target.value }))}
                />
                <Button sx={{ mt: 1 }} type="submit" variant="contained" disabled={actionLoading}>
                  Add Product
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Adjust Inventory
              </Typography>
              <Box component="form" onSubmit={handleAdjustInventory}>
                <TextField
                  select
                  fullWidth
                  margin="dense"
                  label="Product"
                  value={adjustForm.product_id}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, product_id: e.target.value }))}
                  required
                >
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}{product.product_code ? ` (${product.product_code})` : ''}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  margin="dense"
                  label="Region"
                  value={adjustForm.region}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, region: e.target.value }))}
                  required
                />
                <TextField
                  fullWidth
                  margin="dense"
                  type="number"
                  label="Quantity Delta (+in / -out)"
                  value={adjustForm.quantity_delta}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, quantity_delta: e.target.value }))}
                  required
                />
                <TextField
                  fullWidth
                  margin="dense"
                  type="number"
                  label="Restock Threshold (optional update)"
                  value={adjustForm.restock_threshold}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, restock_threshold: e.target.value }))}
                />
                <TextField
                  fullWidth
                  margin="dense"
                  label="Reason"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                />
                <TextField
                  fullWidth
                  margin="dense"
                  label="Notes"
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
                <Button sx={{ mt: 1 }} type="submit" variant="contained" disabled={actionLoading}>
                  Apply Stock Change
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {trainingData && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6">
                Training Results: {trainingData.model_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Trained at: {trainingData.trained_at}
              </Typography>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">MSE</Typography>
                      <Typography variant="h6">{trainingData.metrics?.mse?.toFixed?.(3) ?? trainingData.metrics?.mse}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">RMSE</Typography>
                      <Typography variant="h6">{trainingData.metrics?.rmse?.toFixed?.(3) ?? trainingData.metrics?.rmse}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">R2 Score</Typography>
                      <Typography variant="h6">{trainingData.metrics?.r2?.toFixed?.(4) ?? trainingData.metrics?.r2}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">MAPE</Typography>
                      <Typography variant="h6">{((trainingData.metrics?.mape || 0) * 100).toFixed(2)}%</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12} lg={4}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Learning Curve</Typography>
                  <Box sx={{ height: 260 }}>
                    <Line
                      data={learningCurveData}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: { legend: { position: 'top' } },
                        scales: {
                          x: { title: { display: true, text: 'Training Rows' } },
                          y: { title: { display: true, text: 'RMSE' } },
                        },
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} lg={4}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Top Feature Importance</Typography>
                  <Box sx={{ height: 260 }}>
                    <Bar
                      data={featureImportanceData}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} lg={4}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Residual Distribution</Typography>
                  <Box sx={{ height: 260 }}>
                    <Bar
                      data={residualData}
                      options={{
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Users ({users.length})
              </Typography>
              {users.slice(0, 10).map((user) => (
                <Typography key={user.id} variant="body2">
                  {user.username} - {user.role} - {user.is_active ? 'Active' : 'Inactive'}
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Inventory Records ({inventoryRecords.length})
              </Typography>
              {inventoryRecords.slice(0, 12).map((record) => (
                <Typography key={record.id} variant="body2">
                  {record.product_name}
                  {record.product_code ? ` (${record.product_code})` : ''} [{record.region}] - Stock: {record.current_stock}, Threshold: {record.restock_threshold}, Price: NPR {record.unit_price_npr ?? 0}, Shelf life: {record.shelf_life_days ?? 'N/A'}d
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Stock Transactions
              </Typography>
              {transactions.slice(0, 12).map((txn) => (
                <Typography key={txn.id} variant="body2">
                  {txn.product_name} [{txn.region}] {txn.quantity_delta > 0 ? '+' : ''}
                  {txn.quantity_delta} ({txn.previous_stock} {'->'} {txn.new_stock})
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Auth Logs
              </Typography>
              {authLogs.slice(0, 12).map((log) => (
                <Typography key={log.id} variant="body2">
                  {log.username} - {log.event} - {log.success ? 'SUCCESS' : 'FAILED'}
                </Typography>
              ))}
              <Button sx={{ mt: 1 }} variant="text" onClick={loadData} disabled={actionLoading}>
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AdminPanel;

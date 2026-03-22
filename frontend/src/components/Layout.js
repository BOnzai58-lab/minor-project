import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Avatar,
  AppBar,
  Box,
  Button,
  Chip,
  CssBaseline,
  Drawer,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon,
  Inventory as InventoryIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  LogoutRounded as LogoutRoundedIcon,
  AutoGraph as AutoGraphIcon,
} from '@mui/icons-material';

const drawerWidth = 240;

function Layout({ children, role, username, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Predictions', icon: <TimelineIcon />, path: '/predictions' },
    { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
    ...(role === 'admin'
      ? [{ text: 'Admin', icon: <AdminPanelSettingsIcon />, path: '/admin' }]
      : []),
  ];

  const drawer = (
    <div>
      <Toolbar sx={{ px: 2 }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 32,
              height: 32,
              boxShadow: '0 4px 12px rgba(20, 83, 116, 0.35)',
            }}
          >
            <AutoGraphIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
              SIMS
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Inventory Suite
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
              sx={{
                mx: 1,
                my: 0.4,
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(20, 83, 116, 0.1)',
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Stack direction="row" spacing={1.1} alignItems="center">
            <Avatar
              sx={{
                bgcolor: 'rgba(255,255,255,0.22)',
                width: 34,
                height: 34,
              }}
            >
              <AutoGraphIcon sx={{ fontSize: 19 }} />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                Smart Inventory
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                Management System
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1.2} alignItems="center">
            <Chip
              avatar={<Avatar>{(username || role || 'U').charAt(0).toUpperCase()}</Avatar>}
              label={`${username || 'User'} (${role})`}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.2)',
                '& .MuiChip-avatar': {
                  bgcolor: 'rgba(255,255,255,0.28)',
                  color: 'white',
                },
              }}
            />
            <Button
              variant="contained"
              color="secondary"
              startIcon={<LogoutRoundedIcon />}
              onClick={onLogout}
              sx={{
                color: 'white',
                boxShadow: 'none',
                '&:hover': { boxShadow: 'none' },
              }}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout; 

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform
} from 'react-native';
import {
  Shield,
  Users,
  Search,
  Clock,
  Key,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  User as UserIcon,
  ChevronRight,
  Database,
  RefreshCw
} from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { TabProps } from '@/app/sharedTypes';
import { userService } from '@/services/userService';
import { auditLogService, AuditLog } from '@/services/auditLogService';

const getRelativeTime = (isoString: string, currentLang: string) => {
  try {
    const elapsed = Date.now() - new Date(isoString).getTime();
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const isTa = currentLang === 'ta';
    if (seconds < 10) return isTa ? 'இப்போது' : 'just now';
    if (seconds < 60) return isTa ? `${seconds} வினாடிகளுக்கு முன்` : `${seconds}s ago`;
    if (minutes < 60) return isTa ? `${minutes} நிமிடங்களுக்கு முன்` : `${minutes}m ago`;
    if (hours < 24) return isTa ? `${hours} மணிநேரத்திற்கு முன்` : `${hours}h ago`;
    return isTa ? `${days} நாட்களுக்கு முன்` : `${days}d ago`;
  } catch {
    return isoString;
  }
};

const getRoleColor = (role: string, colors: any) => {
  switch (role) {
    case 'superadmin':
      return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
    case 'admin':
      return { bg: '#F3E8FF', text: '#6B21A8', border: '#D8B4FE' };
    case 'teacher':
      return { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' };
    case 'volunteer':
      return { bg: '#E0F2FE', text: '#0369A1', border: '#7DD3FC' };
    case 'parent':
      return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
    case 'student':
      return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' };
    default:
      return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' };
  }
};

const getActionIcon = (action: string) => {
  const lower = action.toLowerCase();
  if (lower.includes('login')) return { icon: Key, color: '#F59E0B' };
  if (lower.includes('switch')) return { icon: RefreshCw, color: '#8B5CF6' };
  if (lower.includes('approve')) return { icon: CheckCircle, color: '#10B981' };
  if (lower.includes('reject')) return { icon: XCircle, color: '#EF4444' };
  if (lower.includes('delete')) return { icon: Trash2, color: '#EF4444' };
  if (lower.includes('edit') || lower.includes('update')) return { icon: Edit, color: '#3B82F6' };
  return { icon: Shield, color: '#6B7280' };
};

export function SuperAdminTab({ user, colors, t, showToast, i18n }: TabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'logs'>('users');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [logsList, setLogsList] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter state
  const [userSearch, setUserSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');

  // Sorting state for Users Table
  const [userSortField, setUserSortField] = useState<string>('fullName');
  const [userSortAsc, setUserSortAsc] = useState<boolean>(true);

  // Sorting state for Audit Logs Table
  const [logSortField, setLogSortField] = useState<string>('timestamp');
  const [logSortAsc, setLogSortAsc] = useState<boolean>(false);

  // Modal for log inspect
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadData = async (showIndicator = true) => {
    if (showIndicator) setLoading(true);
    try {
      const fetchedUsers = await userService.getUsers();
      const fetchedLogs = await auditLogService.getAuditLogs();
      setUsersList(fetchedUsers);
      setLogsList(fetchedLogs);
    } catch (e) {
      showToast(i18n.language === 'ta' ? 'தரவை ஏற்ற முடியவில்லை' : 'Failed to load portal data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const handleSortUsers = (field: string) => {
    if (userSortField === field) {
      setUserSortAsc(!userSortAsc);
    } else {
      setUserSortField(field);
      setUserSortAsc(true);
    }
  };

  const handleSortLogs = (field: string) => {
    if (logSortField === field) {
      setLogSortAsc(!logSortAsc);
    } else {
      setLogSortField(field);
      setLogSortAsc(true);
    }
  };

  // Filtered and Sorted lists
  const filteredUsers = usersList
    .filter(u => {
      const matchesSearch = 
        (u.fullName || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.phone || '').includes(userSearch);
      const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      let valA = a[userSortField] || '';
      let valB = b[userSortField] || '';
      
      if (userSortField === 'schoolId') {
        valA = (a.schoolId || 'balarmalar parramatta branch').split(' ').slice(1, -1).join(' ');
        valB = (b.schoolId || 'balarmalar parramatta branch').split(' ').slice(1, -1).join(' ');
      }
      
      const comparison = String(valA).localeCompare(String(valB));
      return userSortAsc ? comparison : -comparison;
    });

  const filteredLogs = logsList
    .filter(l => {
      const matchesSearch = 
        (l.userName || '').toLowerCase().includes(logSearch.toLowerCase()) ||
        (l.userEmail || '').toLowerCase().includes(logSearch.toLowerCase()) ||
        (l.action || '').toLowerCase().includes(logSearch.toLowerCase()) ||
        (l.details || '').toLowerCase().includes(logSearch.toLowerCase());
      
      let matchesAction = true;
      if (selectedActionFilter !== 'all') {
        const actLower = l.action.toLowerCase();
        if (selectedActionFilter === 'login') matchesAction = actLower.includes('login');
        else if (selectedActionFilter === 'switch') matchesAction = actLower.includes('switch');
        else if (selectedActionFilter === 'approve') matchesAction = actLower.includes('approve');
        else if (selectedActionFilter === 'reject') matchesAction = actLower.includes('reject');
      }
      return matchesSearch && matchesAction;
    })
    .sort((a, b) => {
      const valA = a[logSortField as keyof AuditLog] || '';
      const valB = b[logSortField as keyof AuditLog] || '';
      
      const comparison = String(valA).localeCompare(String(valB));
      return logSortAsc ? comparison : -comparison;
    });

  const rolesList = ['all', 'superadmin', 'admin', 'teacher', 'volunteer', 'parent', 'student'];
  const actionFilters = [
    { key: 'all', label: 'All Actions', labelTa: 'அனைத்து செயல்களும்' },
    { key: 'login', label: 'Logins', labelTa: 'உள்நுழைவுகள்' },
    { key: 'switch', label: 'Role Switches', labelTa: 'பங்கு மாற்றங்கள்' },
    { key: 'approve', label: 'Approvals', labelTa: 'அங்கீகாரங்கள்' },
    { key: 'reject', label: 'Rejections', labelTa: 'நிராகரிப்புகள்' }
  ];

  const isTa = i18n.language === 'ta';

  const renderSortHeader = (label: string, field: string, currentField: string, isAsc: boolean, onSort: (field: string) => void) => {
    const isActive = currentField === field;
    return (
      <Pressable 
        onPress={() => onSort(field)} 
        style={stylesTab.tableHeaderCellContainer}
      >
        <ThemedText style={[stylesTab.tableHeaderCellText, { color: colors.text }]}>
          {label}
        </ThemedText>
        <ThemedText style={[stylesTab.sortArrow, { color: isActive ? colors.primary : colors.textSecondary }]}>
          {isActive ? (isAsc ? ' ▲' : ' ▼') : ' ↕'}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <View style={[stylesTab.container, { backgroundColor: colors.background }]}>
      {/* Premium Header */}
      <View style={[stylesTab.header, { borderBottomColor: colors.border }]}>
        <View style={stylesTab.headerTitleContainer}>
          <View style={[stylesTab.shieldWrapper, { backgroundColor: colors.primaryLight }]}>
            <Shield size={24} color={colors.primary} />
          </View>
          <View>
            <ThemedText style={stylesTab.headerTitle}>
              {isTa ? 'முதன்மை நிர்வாகி போர்டல்' : 'Super Admin Portal'}
            </ThemedText>
            <ThemedText style={[stylesTab.headerSub, { color: colors.textSecondary }]}>
              {isTa ? 'கணினி செயல்பாடுகள் மற்றும் பயனர்களின் நேரடி விவரங்கள்' : 'Real-time system activities and user profiles'}
            </ThemedText>
          </View>
        </View>
        <Pressable 
          style={({ pressed }) => [
            stylesTab.refreshBtn, 
            { backgroundColor: colors.border, opacity: pressed ? 0.7 : 1 }
          ]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <RefreshCw size={16} color={colors.text} />
          )}
        </Pressable>
      </View>

      {/* Sub-tab Selectors */}
      <View style={stylesTab.tabBar}>
        <Pressable
          style={[
            stylesTab.tabButton,
            activeSubTab === 'users' && [stylesTab.tabActiveButton, { borderColor: colors.primary }]
          ]}
          onPress={() => setActiveSubTab('users')}
        >
          <Users size={16} color={activeSubTab === 'users' ? colors.primary : colors.textSecondary} />
          <ThemedText style={[
            stylesTab.tabText,
            activeSubTab === 'users' ? { color: colors.primary, fontWeight: '700' } : { color: colors.textSecondary }
          ]}>
            {isTa ? 'பயனர் பட்டியல்' : 'Users Directory'}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            stylesTab.tabButton,
            activeSubTab === 'logs' && [stylesTab.tabActiveButton, { borderColor: colors.primary }]
          ]}
          onPress={() => setActiveSubTab('logs')}
        >
          <Database size={16} color={activeSubTab === 'logs' ? colors.primary : colors.textSecondary} />
          <ThemedText style={[
            stylesTab.tabText,
            activeSubTab === 'logs' ? { color: colors.primary, fontWeight: '700' } : { color: colors.textSecondary }
          ]}>
            {isTa ? 'கணினி பதிவுகள் (Audit Logs)' : 'Audit Logs'}
          </ThemedText>
        </Pressable>
      </View>

      {loading ? (
        <View style={stylesTab.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText style={{ marginTop: 12, color: colors.textSecondary }}>
            {isTa ? 'தரவு ஏற்றப்படுகிறது...' : 'Loading portal data...'}
          </ThemedText>
        </View>
      ) : activeSubTab === 'users' ? (
        // --- SORTABLE USERS TABLE VIEW ---
        <View style={{ flex: 1 }}>
          {/* User Search & Filters */}
          <View style={stylesTab.filterSection}>
            <View style={[stylesTab.searchBar, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <Search size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                placeholder={isTa ? 'பெயர், மின்னஞ்சல் அல்லது தொலைபேசியை தேடுங்கள்...' : 'Search by name, email or phone...'}
                placeholderTextColor={colors.textSecondary}
                value={userSearch}
                onChangeText={setUserSearch}
                style={[stylesTab.searchInput, { color: colors.text }]}
              />
            </View>

            {/* Role Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stylesTab.rolesScroll}>
              {rolesList.map(role => {
                const isSelected = selectedRoleFilter === role;
                return (
                  <Pressable
                    key={role}
                    onPress={() => setSelectedRoleFilter(role)}
                    style={[
                      stylesTab.roleChip,
                      { backgroundColor: isSelected ? colors.primary : colors.border },
                      isSelected && { borderColor: colors.primary }
                    ]}
                  >
                    <ThemedText style={[
                      stylesTab.roleChipText,
                      { color: isSelected ? '#FFFFFF' : colors.text }
                    ]}>
                      {role.toUpperCase()}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Users Directory Table with Horizontal Scrolling */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
            <View style={stylesTab.tableWrapper}>
              {/* Table Header Row */}
              <View style={[stylesTab.tableRow, stylesTab.tableHeaderRow, { backgroundColor: colors.backgroundSelected, borderBottomColor: colors.border }]}>
                <View style={{ width: 180 }}>{renderSortHeader(isTa ? 'பெயர்' : 'Name', 'fullName', userSortField, userSortAsc, handleSortUsers)}</View>
                <View style={{ width: 220 }}>{renderSortHeader(isTa ? 'மின்னஞ்சல்' : 'Email', 'email', userSortField, userSortAsc, handleSortUsers)}</View>
                <View style={{ width: 110 }}>{renderSortHeader(isTa ? 'பங்கு' : 'Role', 'role', userSortField, userSortAsc, handleSortUsers)}</View>
                <View style={{ width: 140 }}>{renderSortHeader(isTa ? 'தொலைபேசி' : 'Phone', 'phone', userSortField, userSortAsc, handleSortUsers)}</View>
                <View style={{ width: 150 }}>{renderSortHeader(isTa ? 'கிளை' : 'Branch', 'schoolId', userSortField, userSortAsc, handleSortUsers)}</View>
              </View>

              {/* Table Body Content */}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {filteredUsers.map((item, index) => {
                  const colorsTag = getRoleColor(item.role, colors);
                  const isEven = index % 2 === 0;
                  return (
                    <View 
                      key={item.uid}
                      style={[
                        stylesTab.tableRow, 
                        { 
                          backgroundColor: isEven ? colors.backgroundElement : colors.background,
                          borderBottomColor: colors.border 
                        }
                      ]}
                    >
                      <View style={{ width: 180, paddingRight: 8 }}>
                        <ThemedText style={[stylesTab.tableCellText, { fontWeight: '700' }]}>{item.fullName}</ThemedText>
                      </View>
                      <View style={{ width: 220, paddingRight: 8 }}>
                        <ThemedText style={stylesTab.tableCellText}>{item.email}</ThemedText>
                      </View>
                      <View style={{ width: 110, paddingRight: 8 }}>
                        <View style={[stylesTab.roleBadge, { backgroundColor: colorsTag.bg, borderColor: colorsTag.border, alignSelf: 'flex-start' }]}>
                          <ThemedText style={[stylesTab.roleBadgeText, { color: colorsTag.text }]}>
                            {item.role}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={{ width: 140, paddingRight: 8 }}>
                        <ThemedText style={stylesTab.tableCellText}>{item.phone || '-'}</ThemedText>
                      </View>
                      <View style={{ width: 150, paddingRight: 8 }}>
                        <ThemedText style={stylesTab.tableCellText}>
                          {(item.schoolId || 'balarmalar parramatta branch').split(' ').slice(1, -1).join(' ').toUpperCase() || 'PARRAMATTA'}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <View style={stylesTab.emptyContainer}>
                    <Users size={48} color={colors.textSecondary} />
                    <ThemedText style={{ marginTop: 12, color: colors.textSecondary }}>
                      {isTa ? 'பயனர்கள் யாரும் கிடைக்கவில்லை' : 'No users found matching filters.'}
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      ) : (
        // --- SORTABLE AUDIT LOGS TABLE VIEW ---
        <View style={{ flex: 1 }}>
          {/* Audit Logs Filters */}
          <View style={stylesTab.filterSection}>
            <View style={[stylesTab.searchBar, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <Search size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                placeholder={isTa ? 'செயல்பாடு, விவரம், பயனர் மூலம் தேடுங்கள்...' : 'Search logs by action, details, user...'}
                placeholderTextColor={colors.textSecondary}
                value={logSearch}
                onChangeText={setLogSearch}
                style={[stylesTab.searchInput, { color: colors.text }]}
              />
            </View>

            {/* Action Filters Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stylesTab.rolesScroll}>
              {actionFilters.map(filter => {
                const isSelected = selectedActionFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    onPress={() => setSelectedActionFilter(filter.key)}
                    style={[
                      stylesTab.roleChip,
                      { backgroundColor: isSelected ? colors.primary : colors.border },
                      isSelected && { borderColor: colors.primary }
                    ]}
                  >
                    <ThemedText style={[
                      stylesTab.roleChipText,
                      { color: isSelected ? '#FFFFFF' : colors.text }
                    ]}>
                      {isTa ? filter.labelTa : filter.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Audit Logs Table with Horizontal Scrolling */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
            <View style={[stylesTab.tableWrapper, { minWidth: 950 }]}>
              {/* Table Header Row */}
              <View style={[stylesTab.tableRow, stylesTab.tableHeaderRow, { backgroundColor: colors.backgroundSelected, borderBottomColor: colors.border }]}>
                <View style={{ width: 150 }}>{renderSortHeader(isTa ? 'நேரம்' : 'Time', 'timestamp', logSortField, logSortAsc, handleSortLogs)}</View>
                <View style={{ width: 160 }}>{renderSortHeader(isTa ? 'பயனர்' : 'User', 'userName', logSortField, logSortAsc, handleSortLogs)}</View>
                <View style={{ width: 110 }}>{renderSortHeader(isTa ? 'பங்கு' : 'Role', 'role', logSortField, logSortAsc, handleSortLogs)}</View>
                <View style={{ width: 160 }}>{renderSortHeader(isTa ? 'செயல்பாடு' : 'Action', 'action', logSortField, logSortAsc, handleSortLogs)}</View>
                <View style={{ width: 370 }}>{renderSortHeader(isTa ? 'விவரங்கள்' : 'Details', 'details', logSortField, logSortAsc, handleSortLogs)}</View>
              </View>

              {/* Table Body Content */}
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {filteredLogs.map((item, index) => {
                  const actionMeta = getActionIcon(item.action);
                  const ActionIconComponent = actionMeta.icon;
                  const isEven = index % 2 === 0;
                  return (
                    <Pressable 
                      key={item.logId}
                      style={({ pressed }) => [
                        stylesTab.tableRow, 
                        { 
                          backgroundColor: isEven ? colors.backgroundElement : colors.background,
                          borderBottomColor: colors.border,
                          opacity: pressed ? 0.8 : 1
                        }
                      ]}
                      onPress={() => setSelectedLog(item)}
                    >
                      <View style={{ width: 150, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color={colors.textSecondary} />
                        <ThemedText style={[stylesTab.tableCellText, { fontSize: 11 }]}>
                          {getRelativeTime(item.timestamp, i18n.language)}
                        </ThemedText>
                      </View>
                      <View style={{ width: 160, paddingRight: 8 }}>
                        <ThemedText style={[stylesTab.tableCellText, { fontWeight: '700' }]}>{item.userName}</ThemedText>
                      </View>
                      <View style={{ width: 110, paddingRight: 8 }}>
                        <View style={[stylesTab.roleBadge, { backgroundColor: getRoleColor(item.role, colors).bg, borderColor: getRoleColor(item.role, colors).border, alignSelf: 'flex-start' }]}>
                          <ThemedText style={[stylesTab.roleBadgeText, { color: getRoleColor(item.role, colors).text }]}>
                            {item.role}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={{ width: 160, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[stylesTab.actionIconWrapper, { width: 20, height: 20, borderRadius: 10, backgroundColor: actionMeta.color + '20' }]}>
                          <ActionIconComponent size={11} color={actionMeta.color} />
                        </View>
                        <ThemedText style={[stylesTab.tableCellText, { fontWeight: '700', color: actionMeta.color }]}>
                          {item.action}
                        </ThemedText>
                      </View>
                      <View style={{ width: 370, paddingRight: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <ThemedText style={stylesTab.tableCellText} numberOfLines={1}>
                          {item.details}
                        </ThemedText>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <ThemedText style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>
                            {isTa ? 'ஆய்வு' : 'Inspect'}
                          </ThemedText>
                          <ChevronRight size={12} color={colors.primary} />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <View style={stylesTab.emptyContainer}>
                    <Database size={48} color={colors.textSecondary} />
                    <ThemedText style={{ marginTop: 12, color: colors.textSecondary }}>
                      {isTa ? 'பதிவுகள் எதுவும் கிடைக்கவில்லை' : 'No audit logs found matching filters.'}
                    </ThemedText>
                  </View>
                )}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Audit Log Inspect Modal */}
      <Modal
        visible={selectedLog !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={stylesTab.modalOverlay}>
          <View style={[stylesTab.modalContent, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <View style={[stylesTab.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={stylesTab.modalHeaderTitle}>
                <Shield size={20} color={colors.primary} />
                <ThemedText style={stylesTab.modalTitle}>
                  {isTa ? 'பதிவு ஆய்வு' : 'Audit Log Inspector'}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setSelectedLog(null)}
                style={[stylesTab.closeBtn, { backgroundColor: colors.border }]}
              >
                <ThemedText style={{ fontWeight: '700' }}>✕</ThemedText>
              </Pressable>
            </View>

            {selectedLog ? (
              <ScrollView style={stylesTab.modalBody}>
                {/* Meta details */}
                <View style={stylesTab.metaGroup}>
                  <ThemedText style={[stylesTab.metaLabel, { color: colors.textSecondary }]}>Log ID</ThemedText>
                  <ThemedText style={stylesTab.metaValue}>{selectedLog.logId}</ThemedText>
                </View>

                <View style={stylesTab.metaGroup}>
                  <ThemedText style={[stylesTab.metaLabel, { color: colors.textSecondary }]}>Timestamp</ThemedText>
                  <ThemedText style={stylesTab.metaValue}>
                    {new Date(selectedLog.timestamp).toLocaleString()} ({getRelativeTime(selectedLog.timestamp, i18n.language)})
                  </ThemedText>
                </View>

                <View style={stylesTab.metaGroup}>
                  <ThemedText style={[stylesTab.metaLabel, { color: colors.textSecondary }]}>User</ThemedText>
                  <ThemedText style={stylesTab.metaValue}>
                    {selectedLog.userName} &lt;{selectedLog.userEmail}&gt; ({selectedLog.role})
                  </ThemedText>
                </View>

                <View style={stylesTab.metaGroup}>
                  <ThemedText style={[stylesTab.metaLabel, { color: colors.textSecondary }]}>Action</ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <View style={[stylesTab.actionIconWrapper, { backgroundColor: getActionIcon(selectedLog.action).color + '20', marginRight: 8 }]}>
                      {React.createElement(getActionIcon(selectedLog.action).icon, { size: 14, color: getActionIcon(selectedLog.action).color })}
                    </View>
                    <ThemedText style={[stylesTab.metaValue, { fontWeight: '700', color: getActionIcon(selectedLog.action).color }]}>
                      {selectedLog.action}
                    </ThemedText>
                  </View>
                </View>

                <View style={stylesTab.metaGroup}>
                  <ThemedText style={[stylesTab.metaLabel, { color: colors.textSecondary }]}>Details</ThemedText>
                  <ThemedText style={stylesTab.detailsContent}>{selectedLog.details}</ThemedText>
                </View>

                {/* Raw JSON Inspect */}
                <View style={[stylesTab.jsonContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <ThemedText style={[stylesTab.jsonTitle, { color: colors.textSecondary }]}>RAW DATA</ThemedText>
                  <ThemedText style={stylesTab.jsonCode}>
                    {JSON.stringify(selectedLog, null, 2)}
                  </ThemedText>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const stylesTab = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  shieldWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800'
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderColor: 'transparent'
  },
  tabActiveButton: {
    borderBottomWidth: 2
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterSection: {
    padding: 12,
    gap: 8
  },
  searchBar: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0
  },
  rolesScroll: {
    paddingVertical: 4,
    gap: 8
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center'
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700'
  },
  tableWrapper: {
    flex: 1,
    minWidth: 800
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1
  },
  tableHeaderRow: {
    paddingVertical: 12,
    borderBottomWidth: 2
  },
  tableHeaderCellContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  tableHeaderCellText: {
    fontSize: 12,
    fontWeight: '800'
  },
  sortArrow: {
    fontSize: 10,
    fontWeight: '700'
  },
  tableCellText: {
    fontSize: 12,
    fontWeight: '500'
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12
  },
  actionIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '85%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10
      },
      android: {
        elevation: 5
      }
    })
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800'
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBody: {
    padding: 16
  },
  metaGroup: {
    marginBottom: 16
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600'
  },
  detailsContent: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500'
  },
  jsonContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
    marginBottom: 20
  },
  jsonTitle: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 6
  },
  jsonCode: {
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' }),
    lineHeight: 14
  }
});

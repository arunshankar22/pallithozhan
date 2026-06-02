import { StyleSheet, Platform, Dimensions } from 'react-native';
import { Spacing, MaxContentWidth } from '@/constants/theme';

const { width: windowWidth } = Dimensions.get('window');

export const styles = StyleSheet.create({
  // Branded Header Logos
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoGraphic: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoBadgeDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  logoTextMain: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 14,
  },
  logoTextSub: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 10,
  },

  // Premium Toast Notification
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 48,
    left: '5%',
    right: '5%',
    width: '90%',
    maxWidth: 500,
    alignSelf: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    zIndex: 10000,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    shadowOpacity: 0.1,
    elevation: 6,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },

  // Desktop Split Layout
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    justifyContent: 'space-between',
    height: '100%',
  },
  userBrief: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  briefName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sidebarNav: {
    flex: 1,
    gap: 6,
    marginTop: Spacing.two,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    gap: Spacing.two,
  },
  sidebarNavText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarFooter: {
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 6,
  },
  footerActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  contentPane: {
    flex: 1,
    height: '100%',
  },
  scrollContent: {
    padding: Spacing.five,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },

  // Mobile Layout
  mobileWrapperHeader: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 64,
    zIndex: 100,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    height: 64,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerIconButton: {
    padding: 4,
  },
  mobileScrollContent: {
    padding: Spacing.three,
    paddingTop: 80,
    paddingBottom: 110,
  },
  mobileTabBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingBottom: Spacing.two,
    zIndex: 100,
  },
  mobileTabButton: {
    alignItems: 'center',
    width: 60,
  },
  mobileIconWrapper: {
    width: 48,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  mobileTabText: {
    fontSize: 9,
    fontWeight: '600',
  },

  // Unified Dashboard Styling Tokens
  tabContentWrapper: {
    gap: Spacing.four,
    width: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: 16,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Interactive Form drawer components
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  rowForm: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  formCol: {
    flex: 1,
    minWidth: 180,
    gap: 6,
  },
  formInputLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  formGroup: {
    gap: 6,
    marginBottom: Spacing.two,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  formInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    fontSize: 13,
  },
  formTextArea: {
    minHeight: 68,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  formButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  formCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
  },
  formSubmitButton: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Google Drive nested media layouts
  mediaAttachmentWrapper: {
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAE8DE',
    marginVertical: 4,
  },
  driveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  driveHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  driveDesc: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  mediaPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaPresetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
  },
  mediaPresetText: {
    fontSize: 11,
    fontWeight: '700',
  },
  customMediaAttachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  browseDriveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  browseDriveBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  driveModalContainer: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  driveModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  driveModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  breadcrumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    gap: 6,
    marginBottom: Spacing.one,
  },
  backStackBtn: {
    padding: 4,
    borderRadius: 8,
  },
  breadcrumbItemText: {
    fontSize: 12,
    fontWeight: '600',
  },
  breadcrumbItemTextActive: {
    fontSize: 12,
    fontWeight: '700',
  },
  driveItemsList: {
    maxHeight: 240,
  },
  emptyFolderText: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: Spacing.four,
  },
  driveItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderBottomWidth: 1,
  },
  driveItemName: {
    fontSize: 12,
    fontWeight: '600',
  },
  directPathContainer: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.two,
  },
  directPathLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  directPathRow: {
    flexDirection: 'row',
    gap: 8,
  },
  directPathInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  directPathSelectBtn: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directPathSelectBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  driveModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderColor: 'transparent',
    paddingTop: Spacing.two,
  },
  driveModalCloseBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: Spacing.three,
  },
  driveModalCloseBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  driveConnectCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  driveConnectBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthModalContainer: {
    width: '90%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.five,
    gap: Spacing.three,
  },
  oauthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#e8eaed',
    paddingBottom: Spacing.two,
    marginBottom: Spacing.one,
  },
  oauthStepContent: {
    paddingVertical: Spacing.one,
  },
  oauthTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  oauthSubtitle: {
    fontSize: 12,
    color: '#5f6368',
    marginBottom: Spacing.three,
  },
  oauthInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
    marginBottom: Spacing.one,
  },
  oauthActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  oauthBtnCancel: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  oauthBtnNext: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  oauthEmailPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f3f4',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: Spacing.three,
    fontSize: 11,
    fontWeight: '600',
    color: '#3c4043',
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: '#dadce0',
  },

  // Newsfeed Cards
  postsList: {
    gap: Spacing.three,
  },
  postCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postAuthor: {
    fontSize: 13,
    fontWeight: '700',
  },
  postDate: {
    fontSize: 10,
    marginTop: 1,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: Spacing.one,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  postImageWrapper: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  simulatedImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulatedImageText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Dashboard structure
  dashboardContainer: {
    gap: Spacing.three,
  },
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoCardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  parentLogsContainer: {
    marginTop: Spacing.two,
    gap: 6,
  },
  parentLogItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
  },
  alertCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
  },
  alertCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  alertCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyAlertText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  pushedAlertsList: {
    gap: Spacing.two,
  },
  pushedAlertRow: {
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
  },
  alertItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  alertItemBody: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  alertItemTime: {
    fontSize: 9,
    fontWeight: '600',
  },

  // Admin Approvals Panel
  approvalPanel: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  panelDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: Spacing.two,
  },
  emptyQueueText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  queueList: {
    gap: Spacing.two,
  },
  queueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  queueTextDetails: {
    flex: 1,
    minWidth: 180,
  },
  queueStudentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  queueClassDetails: {
    fontSize: 11,
    marginTop: 2,
  },
  approveButton: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  approveButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Parent & Admin Attendance Dashboard styles
  alertsSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  alertHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  alertChipRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.two,
    gap: 4,
  },
  studentReportCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  parentStudentTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  scoreBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  statCell: {
    flex: 1,
    borderRadius: 12,
    padding: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  logItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  statusDotChip: {
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  authBadge: {
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  pendingAlertsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
  },

  // Attendance Card
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  attendanceCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.three,
  },
  classChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  classChip: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.two,
    borderRadius: 16,
    borderWidth: 1,
  },
  classChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  studentListWrapper: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  listHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  studentRoleBadge: {
    fontSize: 11,
    marginTop: 2,
  },
  rollButtonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  rollButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderColor: 'transparent',
  },
  rollBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  submitRollButton: {
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  submitRollBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  noStudentsText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },

  // Homework Layout
  homeworkGrid: {
    gap: Spacing.three,
  },
  homeworkCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
  },
  homeworkHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  classBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  classBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  homeworkTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  homeworkDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.two,
  },
  homeworkAuthor: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  completedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
  },
  completedButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  teacherStatusCard: {
    padding: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
  },
  teacherStatusText: {
    fontSize: 11,
    lineHeight: 14,
  },

  // Messaging Thread Layout
  chatBoxCard: {
    borderRadius: 24,
    borderWidth: 1,
    height: 480,
    overflow: 'hidden',
  },
  chatHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  onlineIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineText: {
    fontSize: 9,
    fontWeight: '600',
  },
  chatScroll: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  messageBubbleWrapper: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  myMsgWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirMsgWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageTime: {
    fontSize: 8,
    marginTop: 4,
    fontWeight: '600',
  },
  chatInputBar: {
    flexDirection: 'row',
    padding: Spacing.two,
    alignItems: 'center',
    gap: Spacing.two,
  },
  chatTextInput: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Calendar
  eventsGrid: {
    gap: Spacing.three,
  },
  eventCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  dateBlock: {
    width: 60,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBlockDay: {
    fontSize: 22,
    fontWeight: '800',
  },
  dateBlockMonth: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  eventDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: Spacing.two,
  },
  eventTimeLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventTimeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Reports
  reportsGrid: {
    gap: Spacing.four,
  },
  reportCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  reportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  reportMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  previewTable: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
  },
  tableHeader: {
    borderBottomWidth: 2,
  },
  tableHeaderCol: {
    fontSize: 11,
    fontWeight: '700',
  },
  tableHeaderColRight: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  tableCol: {
    fontSize: 12,
    fontWeight: '600',
  },
  tableColRight: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  csvButton: {
    flexDirection: 'row',
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  csvButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Profile
  profileCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.five,
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  profileAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: Spacing.one,
  },
  profileRoleBadge: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
  },
  profileRoleText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  profileDetailsList: {
    alignSelf: 'stretch',
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  profileLogoutBtn: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  profileLogoutText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  profileResetBtn: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  profileResetText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Child Switcher Style
  childSwitcherContainer: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  switcherLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  switcherScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  switcherTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  switcherTabText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Reactions & Comments Style
  postReactionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  reactionStatsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },
  postActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    flex: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 0.5,
    gap: 8,
  },
  commentBubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commentBubble: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 0.5,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentDate: {
    fontSize: 10,
  },
  commentText: {
    fontSize: 12,
    lineHeight: 16,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  commentActionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    height: 36,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentInputEdit: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    minHeight: 32,
    marginBottom: 4,
  },
  editCommentBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  editCommentBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  editCommentBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

import { StyleSheet } from '@react-pdf/renderer';

/**
 * Styles for the pakbon (waybill) PDF. Built with @react-pdf/renderer's
 * subset of CSS — flexbox + a few text props. No Tailwind here: these run
 * inside the PDF VM, not the DOM.
 *
 * Conventions:
 *  - All sizes in pt (the @react-pdf default).
 *  - Colors are printer-friendly grays; no theme color (printers smear it).
 *  - Mono usage is implied via fontFamily 'Courier' for IMEI/order numbers.
 */
export const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 60, // leave room for the fixed footer
    paddingHorizontal: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111111',
    lineHeight: 1.35,
  },

  // --- Header band ---------------------------------------------------------
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  headerLeft: {
    flexDirection: 'column',
    maxWidth: '60%',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    maxWidth: '40%',
  },
  logo: {
    width: 120,
    height: 36,
    objectFit: 'contain',
    marginBottom: 6,
  },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  companyLine: {
    fontSize: 9,
    color: '#444444',
  },
  companyMeta: {
    fontSize: 8,
    color: '#666666',
    marginTop: 4,
  },
  pakbonTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
  },
  orderNumber: {
    fontSize: 12,
    fontFamily: 'Courier-Bold',
    marginTop: 2,
  },
  shippedAt: {
    fontSize: 9,
    color: '#444444',
    marginTop: 4,
  },

  // --- Section heading -----------------------------------------------------
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 14,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    color: '#222222',
  },
  sectionMeta: {
    fontSize: 9,
    color: '#666666',
  },

  // --- Address block -------------------------------------------------------
  addressBlock: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 3,
    backgroundColor: '#fafafa',
  },
  addressLine: {
    fontSize: 11,
  },
  addressLineStrong: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },

  // --- Table (units / accessoires) ----------------------------------------
  table: {
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#dddddd',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
    color: '#444444',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  tableRowLast: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableCell: {
    fontSize: 10,
  },
  tableCellMono: {
    fontSize: 10,
    fontFamily: 'Courier',
  },

  // Column flex weights — used by both Units and Accessoires table.
  colProduct: { flex: 3 },
  colImei: { flex: 2 },
  colQty: { flex: 1, textAlign: 'right' },

  // --- Footer band ---------------------------------------------------------
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#cccccc',
  },
  footerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  footerTotal: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  footerSignature: {
    fontSize: 9,
    color: '#444444',
  },
  footerBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#777777',
  },

  // --- Misc ---------------------------------------------------------------
  muted: {
    color: '#999999',
  },
});

import type { Product } from '../types/product';
import {
  closePreviewProductFromUser,
  openPreviewProductFromUser,
  useCataloguePreviewContext
} from '../state/previewContext';
export function useSelectedProduct() {
  const preview = useCataloguePreviewContext();
  return {
    selectedId: preview.catalogue.quickViewOpen ? preview.catalogue.selectedProductId : null,
    openProduct: (product: Product) => openPreviewProductFromUser(product),
    closeProduct: closePreviewProductFromUser
  };
}

// Product Management Logic
class ProductManager {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Add Product
        const saveProductBtn = document.getElementById('saveProduct');
        if (saveProductBtn) {
            saveProductBtn.addEventListener('click', this.handleAddProduct.bind(this));
        }

        // Edit Product
        document.querySelectorAll('.edit-product').forEach(button => {
            button.addEventListener('click', this.handleEditProduct.bind(this));
        });

        // Delete Product
        document.querySelectorAll('.delete-product').forEach(button => {
            button.addEventListener('click', this.handleDeleteProduct.bind(this));
        });

        // Edit Form Submit
        const editForm = document.getElementById('editProductForm');
        if (editForm) {
            editForm.addEventListener('submit', this.handleUpdateProduct.bind(this));
        }

        // Image Library
        this.initializeImageLibrary();
    }

    async handleAddProduct() {
        const form = document.getElementById('addProductForm');
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/admin/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (response.ok) {
                window.location.reload();
            } else {
                throw new Error(result.message || 'Failed to add product');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Error adding product');
        }
    }

    async handleEditProduct(event) {
        const productId = event.currentTarget.dataset.productId;
        try {
            const response = await fetch(`/admin/products/${productId}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load product');
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Failed to load product');
            }

            this.populateEditForm(result.product);
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Error loading product');
        }
    }

    populateEditForm(product) {
        // Set form values
        document.getElementById('editProductId').value = product.id;
        document.getElementById('editProductName').value = product.name;
        document.getElementById('editProductCategory').value = product.category_id;
        document.getElementById('editProductPrice').value = product.price;
        document.getElementById('editProductStock').value = product.stock;
        document.getElementById('editProductDescription').value = product.description || '';
        document.getElementById('editProductStatus').value = product.status || 'active';

        // Handle image
        if (product.image_url) {
            document.getElementById('editProductImage').value = product.image_url;
            const preview = document.getElementById('productImagePreview');
            preview.src = product.image_url;
            preview.style.display = 'block';
        } else {
            const preview = document.getElementById('productImagePreview');
            preview.style.display = 'none';
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editProductModal'));
        modal.show();
    }

    async handleUpdateProduct(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const productId = data.id;

        try {
            const response = await fetch(`/admin/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                window.location.reload();
            } else {
                throw new Error(result.message || 'Failed to update product');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Error updating product');
        }
    }

    async handleDeleteProduct(event) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        const productId = event.currentTarget.dataset.productId;
        try {
            const response = await fetch(`/admin/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok) {
                window.location.reload();
            } else {
                throw new Error(result.message || 'Failed to delete product');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Error deleting product');
        }
    }

    initializeImageLibrary() {
        const imageLibraryModal = new bootstrap.Modal(document.getElementById('imageLibraryModal'));
        
        // Handle opening image library
        const openImageLibraryBtn = document.getElementById('openImageLibrary');
        if (openImageLibraryBtn) {
            openImageLibraryBtn.addEventListener('click', () => {
                // Load images before showing modal
                this.loadProductImages().then(() => {
                    imageLibraryModal.show();
                });
            });
        }

        // Handle file upload
        const customFileInput = document.getElementById('customFile');
        if (customFileInput) {
            customFileInput.addEventListener('change', (e) => this.handleFileUpload(e, imageLibraryModal));
        }

        // Update image preview when URL changes
        const editProductImage = document.getElementById('editProductImage');
        if (editProductImage) {
            editProductImage.addEventListener('change', () => this.updateImagePreview(editProductImage.value));
        }
    }

    async loadProductImages() {
        try {
            const response = await fetch('/admin/products/images');
            if (!response.ok) throw new Error('Failed to load images');
            
            const images = await response.json();
            const imageLibrary = document.getElementById('imageLibrary');
            imageLibrary.innerHTML = '';
            
            images.forEach(image => {
                const col = document.createElement('div');
                col.className = 'col-md-3 mb-3';
                
                const img = document.createElement('img');
                img.src = image.url;
                img.className = 'img-thumbnail';
                img.style.cursor = 'pointer';
                img.alt = image.name;
                img.title = 'Click to select this image';
                img.onclick = () => this.handleImageSelection(image.url);
                
                col.appendChild(img);
                imageLibrary.appendChild(col);
            });
        } catch (error) {
            console.error('Error loading images:', error);
            alert('Failed to load images. Please try again.');
        }
    }

    handleImageSelection(imageUrl) {
        const imageInput = document.getElementById('editProductImage');
        const imagePreview = document.getElementById('productImagePreview');
        
        // Update the input value with the full path
        imageInput.value = imageUrl;
        
        // Update the preview
        imagePreview.src = imageUrl;
        imagePreview.style.display = 'block';
        
        // Close the image library modal
        const imageLibraryModal = bootstrap.Modal.getInstance(document.getElementById('imageLibraryModal'));
        imageLibraryModal.hide();
    }

    updateImagePreview(imageUrl) {
        const preview = document.getElementById('productImagePreview');
        if (imageUrl) {
            preview.src = imageUrl;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    }

    async handleFileUpload(event, modal) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/admin/products/upload-image', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (response.ok) {
                this.addImageToLibrary(result.url);
                this.handleImageSelection(result.url);
            } else {
                throw new Error(result.message || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert(error.message || 'Error uploading image');
        }
    }

    addImageToLibrary(imageUrl) {
        const imageLibrary = document.getElementById('imageLibrary');
        const col = document.createElement('div');
        col.className = 'col-md-3 mb-3';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = 'img-thumbnail';
        img.style.cursor = 'pointer';
        img.alt = 'Uploaded image';
        img.title = 'Click to select this image';
        
        img.addEventListener('click', () => this.handleImageSelection(imageUrl));
        
        col.appendChild(img);
        imageLibrary.insertBefore(col, imageLibrary.firstChild);
    }
}

// Initialize Product Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProductManager();
}); 
const deleteProduct = (button) =>{
    
    const parentNode = button.parentNode;
    const productId = parentNode.querySelector('[name=productId').value;
    const csrf = parentNode.querySelector('[name=_csrf').value;

    const productElement = button.closest('article');
    // console.log(productId);

    fetch(`/admin/product/${productId}`,{
        method: 'DELETE',
        headers: {
            'csrf-token': csrf
        }
    })
    .then(result => {
        return result.json();
    })
    .then(data => {
        console.log(data);
        productElement.remove();
    })
    .catch(err => console.log(err));
}
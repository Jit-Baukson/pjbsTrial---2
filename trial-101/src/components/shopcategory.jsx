import { Link } from 'react-router-dom'

function ShopCategory({ selectedCategory }) {

    const categories = ["doraemon", "spongebob", "Nailong"];
   
    return(
        <div className="shop-category">
            <h2>Categories</h2>
            <div className="categories__rule"></div>
            <div className="category__container">
                {categories.map((category) => (
                    <Link key={category} to={`/shopping/${category}`}>
                        <div className={`category__product ${category === selectedCategory ? "selected" : ""}`}>
                            {category}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default ShopCategory
import { Link } from 'react-router-dom'

function ShopCategory({ selectedCategory }) {

    const categories = ["doraemon", "spongebob", "Nailong"];
   
    return(
        <div className="shop-category">
            <h2>Catergories</h2>
            <div className="categories__rule"></div>
            <div className="category__container">
                {categories.map((category, index) => (
                    <div key={index} className={`category__product ${category == selectedCategory ? "selected" : ""}`}>
                        <Link to={`/shopping/${category}`}>
                            {category}
                        </Link>
                        {console.log(category, selectedCategory, category === selectedCategory)}
                       
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ShopCategory
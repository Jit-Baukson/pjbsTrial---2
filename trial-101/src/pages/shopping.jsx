import React, {useState, useEffect} from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import ShopCategory from '../components/shopcategory.jsx'
import ProductsDisplay from '../components/shopproducts.jsx'

function Shopping() {
   
    const { category } = useParams()

    console.log(category)

    return(
        <main className="main-content" id="main-content">
            <section className="shop-page">
                <ShopCategory/>
                <ProductsDisplay category={category}/>
            </section>
        </main>
    );
}

export default Shopping
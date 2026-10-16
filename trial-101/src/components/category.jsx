import spongebobCluster from '../assets/images/groups/spongebobCluster.png'
import randomAestheticCluster from '../assets/images/groups/randomAestheticCluster.png'
import pokemonCluster from '../assets/images/groups/pokemonCluster.png'
import totoroCluster from '../assets/images/groups/totoroCluster.png'
import sinchanCluster from '../assets/images/groups/sinchanCluster.png'
import catCluster from '../assets/images/groups/catCluster.png'

function category() {
    return(
    <section className="gallery" id="gallery" aria-labelledby="gallery-header">
        <h2 className="gallery__header" id="gallery-header">Category</h2>
        <div className="sticker-collage">
            <img className="spongebob" src={spongebobCluster} alt="spongebob cluster" loading="lazy"/>
            <img className="randomAesthetic" src={randomAestheticCluster} alt="random aesthetic cluster" loading="lazy"/>
            <img className="pokemon" src={pokemonCluster} alt="pokemon cluster" loading="lazy"/>
            <img className="totoro" src={totoroCluster} alt="totoro cluster" loading="lazy"/>
            <img className="sinchan" src={sinchanCluster} alt="sinchan cluster" loading="lazy"/>
            <img className="cat" src={catCluster} alt="cat cluster" loading="lazy"/>
        </div>
    </section>
    );
}

export default category